import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException, } from '@nestjs/common';
import { CreateParkingAvenueDto } from './dto/create-parking-avenue.dto';
import { UpdateParkingAvenueDto } from './dto/update-parking-avenue.dto';
import { DatabaseService } from '../database/database.service';
import { SearchParkingDto } from './dto/search-parking-avenue.dto';
import { ApprovalStatus, ParkingAvenue, Prisma } from '@prisma/client';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { v4 as uuidv4 } from 'uuid';
import { GetReservationsDto } from './dto/get-reservations.dto';
import { GetCheckInsDto } from './dto/get-check-ins.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LiveActivityEvent } from 'src/event/live-activity.event';
import { GetNameParkingAvenueDto } from './dto/get-name-parking-avenue.dto';
import { CreateParkingAvenueImageDto } from './dto/create-parking-avenue-image.dto';
import { GetMyParkingAvenueDetailDto } from './dto/get-my-parking-avenue-detail.dto';
import axios from 'axios';
import { GetParkingAvenueDetailDto } from './dto/get-parking-avenue-detail.dto';
import { CheckInService } from '../check-in/check-in.service';
import { CreateCheckInDto } from 'src/check-in/dto/create-check-in.dto';
const PAGE_SIZE = 10;

@Injectable()
export class ParkingAvenueService {
  logger: any;
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
    private readonly checkInService: CheckInService
  ) { }

  paginate(items: any[]) {
      const hasMore = items.length > PAGE_SIZE;
      const data = hasMore ? items.slice(0, PAGE_SIZE) : items;
      const nextCursor = hasMore
        ? data[data.length - 1].id
        : null;

        return { data, hasMore, nextCursor };
    }

  private readonly AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

  async create(createParkingAvenueDto: CreateParkingAvenueDto, userId: string) {
    const parkingAvenueOwnerCheck =
      await this.databaseService.parkingAvenueOwner.findUnique({
        where: { id: userId },
      });

    if (!parkingAvenueOwnerCheck) {
      throw new NotFoundException(
        'Only parking avenue owners can register parking avenues',
      );
    }

    if ((parkingAvenueOwnerCheck.isVerified === ApprovalStatus.UNDERREVIEW) || (parkingAvenueOwnerCheck.isVerified === ApprovalStatus.REJECTED)) {
      throw new BadRequestException("Only Verified parking avenue owners can register parking avenues")
    }

    const existingParkingAvenueCheck = await this.databaseService.parkingAvenue.findFirst({
      where: {
        OR: [
          {name: createParkingAvenueDto.name},
          {address: createParkingAvenueDto.address}
        ]
      }
    })

    if(existingParkingAvenueCheck){
      if(existingParkingAvenueCheck.name === createParkingAvenueDto.name){
        throw new ConflictException('This is name is already taken')
      }
      if(existingParkingAvenueCheck.address === createParkingAvenueDto.address){
        throw new ConflictException('This address is already taken')
      }
    }

    return this.databaseService.parkingAvenue.create({
      data: { ...createParkingAvenueDto, ownerId: userId },
    });
  }

  async findNearby(searchDto: SearchParkingDto) {
    const { latitude, longitude, radius } = searchDto;

    // 6371 is the radius of the Earth in km
    const results = await this.databaseService.$queryRaw<ParkingAvenue[]>`
        SELECT id, name, address, latitude, longitude, status, "hourlyRate",
        (
          6371 * acos(
            cos(radians(${latitude})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${longitude})) +
            sin(radians(${latitude})) * sin(radians(latitude))
          )
        ) AS distance
        FROM "ParkingAvenue"
        WHERE (
          6371 * acos(
            cos(radians(${latitude})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${longitude})) +
            sin(radians(${latitude})) * sin(radians(latitude))
          )
        ) < ${radius}
        ORDER BY distance ASC
      `;

    return results;
  }

  async getParkingAvenueDetail(parkingAvenueId: string, eta: number){
    const parkingAvenue = await this.databaseService.parkingAvenue.findFirst(
      {
        where: {
          id: parkingAvenueId
        },
        select: {
          id: true,
          name: true,
          address: true,
          workingHrs: true,
          hourlyRate: true,
          totalSpots: true,
          status: true,
          currentSpots: true,
        }
      }
    );

    if(!parkingAvenue){
      throw new NotFoundException("You do not have any parking avenues");
    }

    interface PredictionResponse {
      predicted_occupancy_rate: number; 
      confidence_score: number;
    }

    let parkingAvenueDetail = {} as GetParkingAvenueDetailDto;

    try {
      // Ask the AI service for a prediction
      const aiResponse = await axios.post<PredictionResponse>(`${this.AI_SERVICE_URL}/predict`, {
        parking_avenue_id: parkingAvenue.id,
        eta_minutes: eta,
      });

      parkingAvenueDetail.prediction = aiResponse.data.predicted_occupancy_rate;
      parkingAvenueDetail.confidence = aiResponse.data.confidence_score;
    } catch (error) {
      this.logger.warn(`AI prediction unavailable for lot ${parkingAvenue.id}`);
    }

    parkingAvenueDetail.parkingAvenue = parkingAvenue as unknown as ParkingAvenue;

    return parkingAvenueDetail;
  }

  async createReservation(dto: CreateReservationDto, userId: string) {
    const { parkingAvenueId, startTime, durationHours, plateNumber } = dto;
    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

    const existingPending = await this.databaseService.reservation.findFirst({
      where: {
        userId,
        parkingAvenueId,
        status: 'PENDING',
      },
    });
  
    if (existingPending) {
      throw new ConflictException('You already have a pending reservation for this avenue.');
    }

    const parkingSpot = await this.databaseService.parkingAvenue.findUnique({
      where: { id: parkingAvenueId },
    });

    if (!parkingSpot) {
      throw new NotFoundException('Parking avenue not found');
    }

    const conflictingReservations = await this.databaseService.reservation.count({
      where: {
        parkingAvenueId: parkingAvenueId,
        status: 'CONFIRMED', // Only count confirmed bookings
        OR: [
          {
            startTime: { lt: end },
            endTime: { gt: start },
          },
        ],
      },
    });

    if (conflictingReservations >= parkingSpot.currentSpots) {
      throw new ConflictException('Parking spot is fully booked for this time slot');
    }

    const totalPrice = parkingSpot.hourlyRate * durationHours;
    const bookingRef = `PK-${uuidv4().substring(0, 8).toUpperCase()}`;

    try {
      const reservation = await this.databaseService.reservation.create({
        data: {
          bookingRef,
          startTime: start,
          endTime: end,
          durationHours,
          totalPrice,
          status: 'PENDING',
          plateNumber,
          userId,
          parkingAvenueId,
        },
      });

      this.eventEmitter.emit( // emitting the event
        'live.activity', // event name
        new LiveActivityEvent(
          parkingAvenueId,
          'RESERVATION',
          `New reservation at ${parkingSpot.name}`,
          new Date(),
          { amount: reservation.totalPrice, parkingId: parkingSpot.id }
        )
      );

      return {
        message: 'Reservation initiated. Proceed to payment.',
        reservationId: reservation.id,
        bookingRef: reservation.bookingRef,
        totalPrice: reservation.totalPrice,
        status: reservation.status
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'You already have a reservation for this parking avenue.'
          );
        }
        throw error;
      }

      console.error('Reservation creation failed:', error);
      throw new InternalServerErrorException('Failed to create reservation');
    }
  }

  async getReservationsByAvenue(parkingAvenueId: string, query: GetReservationsDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const avenue = await this.databaseService.parkingAvenue.findUnique({
      where: { id: parkingAvenueId },
    });
    if (!avenue) {
      throw new NotFoundException(`Parking avenue #${parkingAvenueId} not found`);
    }

    const [data, total] = await Promise.all([
      this.databaseService.reservation.findMany({
        where: { parkingAvenueId },
        skip: skip,
        take: limit,
        select: {
          bookingRef: true,
          startTime: true,
          endTime: true,
          totalPrice: true,
          status: true,
          user: { select: { firstName: true, lastName: true } }
        },
        orderBy: { startTime: 'desc' },
      }),
      this.databaseService.reservation.count({
        where: { parkingAvenueId },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
      },
    };
  }

  async getReservationsByUser(userId: string, query: GetReservationsDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const user = await this.databaseService.customer.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User #${userId} not found`);
    }

    const [data, total] = await Promise.all([
      this.databaseService.reservation.findMany({
        where: { userId: userId },
        skip: skip,
        take: limit,
        select: {
          bookingRef: true,
          startTime: true,
          endTime: true,
          totalPrice: true,
          qrCode: true,
          status: true,
          parkingAvenue: { 
            select: { 
              name: true, 
              parkingAvenueImage: {
                select: {
                  photosUrl: true,
                }
              }
            }
          }
        },
        orderBy: { startTime: 'desc' },
      }),
      this.databaseService.reservation.count({
        where: { parkingAvenueId: userId },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
      },
    };
  }

async verifyPayment(bookingRef: string) {
  const reservation = await this.databaseService.reservation.findUnique({
    where: { bookingRef: bookingRef },
  });

  if (!reservation) {
    this.logger.error(`Reservation with ref ${bookingRef} not found`);
    throw new NotFoundException('Reservation not found');
  }

  // Prevent Double Check-ins
  if (reservation.status === 'FULFILLED') {
    throw new ConflictException('This reservation has already been used for check-in.');
  }

  if (reservation.status === 'CONFIRMED') {
    let dto = new CreateCheckInDto();
    dto.licensePlate = reservation.plateNumber;
    dto.parkingAvenueId = reservation.parkingAvenueId;
    dto.userId = reservation.userId;
    
    try {
      await this.checkInService.create(dto);

      await this.databaseService.reservation.update({
        where: { id: reservation.id },
        data: { status: 'FULFILLED' }
      });

      return { message: 'Reservation confirmed and vehicle checked in successfully.' };

    } catch (error) {
      this.logger.error(`Failed to auto check-in reservation ${bookingRef}`, error.stack);
      throw new InternalServerErrorException('Reservation is confirmed, but automatic check-in failed. Please check-in manually.');
    }
  }

  return { message: 'Reservation not confirmed yet.' };
}

  async getAvenueCheckIns(parkingAvenueId: string, dto: GetCheckInsDto) {
    const { page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.databaseService.checkIn.findMany({
        where: { parkingAvenueId },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNo: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.databaseService.checkIn.count({ where: { parkingAvenueId } }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPreviousPage: page >

          1,
      },
    };
  }

  async getMyParkingAvenueList(parkingAvenueOwnerId: string, cursor?: string){
    
    const parkingAvenues = await this.databaseService.parkingAvenue.findMany(
      {
        where: {
          ownerId: parkingAvenueOwnerId,
            ...(cursor ? { id: { gt: cursor } } : {}),
        },
        orderBy: {
            id: 'asc',
          },
          take: PAGE_SIZE + 1
      }
    );

    if(!parkingAvenues){
      throw new NotFoundException("You do not have any parking avenues");
    }

    return this.paginate(parkingAvenues);
  }

    async getMyParkingAvenueDetail(parkingAvenueOwnerId: string, parkingAvenueId: string){
    
    const parkingAvenue = await this.databaseService.parkingAvenue.findFirst(
      {
        where: {
          ownerId: parkingAvenueOwnerId,
          id: parkingAvenueId
        }
      }
    );

    if(!parkingAvenue){
      throw new NotFoundException("You do not have any parking avenues");
    }

    return parkingAvenue;
  }

  async getParkingAvenueByName(getParkingAvenueByName: GetNameParkingAvenueDto){
    
    const parkingAvenue = await this.databaseService.parkingAvenue.findUnique(
      {
        where: {
          name: getParkingAvenueByName.name
        },
        select: {
          name: true,
          address: true,
          workingHrs: true,
          hourlyRate: true,
          type: true,
          totalSpots: true,
          status: true,
          currentSpots: true,
          legalDoc: true

        }
      }
    );

    if(!parkingAvenue){
      throw new NotFoundException("Parking avenue with this name doesn't exist")
    }

    return parkingAvenue;
    
  }

  async update(parkingAvenueId: string, updateParkingAvenueDto: UpdateParkingAvenueDto, parkingAvenueOwnerId: string){

    const parkingAvenueOwnerCheck = await this.databaseService.parkingAvenueOwner.findUnique({
      where: { id: parkingAvenueOwnerId },
    });
    
    if (!parkingAvenueOwnerCheck) {
          throw new NotFoundException(
            'Only parking avenue owners can update warden account',
          );
    }

    const parkingAvenue = await this.databaseService.parkingAvenue.findUnique(
      {
        where: {
          id: parkingAvenueId
        }
      }
    );

    if(!parkingAvenue){
      throw new NotFoundException("Parking avenue does not exist");
    }

    return this.databaseService.parkingAvenue.update(
      {
        where: {
          id: parkingAvenueId
        },
        data: updateParkingAvenueDto
      }
    );

  }

  async remove(parkingAvenueId: string, parkingAvenueOwnerId: string){

    const parkingAvenueOwnerCheck = await this.databaseService.parkingAvenueOwner.findUnique({
      where: { id: parkingAvenueOwnerId },
    });
    
    if (!parkingAvenueOwnerCheck) {
          throw new NotFoundException(
            'Only parking avenue owners can delete warden account',
          );
    }
    
    const parkingAvenue = await this.databaseService.parkingAvenue.findUnique(
      {
        where: {
          id: parkingAvenueId
        }
      }
    )

    if(!parkingAvenue){
      throw new NotFoundException("Parking Avenue does not exist")
    }

    const deleteParkingAvenue = await this.databaseService.parkingAvenue.delete(
      {
        where: {
          id: parkingAvenueId
        }
      }
    );


  }

  async addImage(createParkingAvenueImageDto: CreateParkingAvenueImageDto, parkingAvenueOwnerId: string){

    const parkingAvenueOwnerCheck =
      await this.databaseService.parkingAvenueOwner.findUnique({
        where: { id: parkingAvenueOwnerId },
      });

    if (!parkingAvenueOwnerCheck) {
      throw new NotFoundException(
        'Only parking avenue owners can add image to parking avenues',
      );
    }

    const parkingAvenueId = await this.databaseService.parkingAvenue.findUnique(
      {
        where: {
          id: createParkingAvenueImageDto.parkingAvenueId
        }
      }
    );

    if(!parkingAvenueId){
      throw new NotFoundException("This parking avenue does not exist");
    }

    return this.databaseService.parkingAvenueImage.create(
      {
        data: createParkingAvenueImageDto
      }
    );


  }

  async getMyParkingAvenueImages(getMyParkingAvenueDetailDto: GetMyParkingAvenueDetailDto, parkingAvenueOwnerId: string){

    const parkingAvenue = await this.databaseService.parkingAvenue.findFirst(
      {
        where: {
          ownerId: parkingAvenueOwnerId,
          id: getMyParkingAvenueDetailDto.id
        },
        select: {
          parkingAvenueImage: true
        }
      }
    );

    if(!parkingAvenue){
      throw new NotFoundException("You do not have any parking avenues");
    }

    return parkingAvenue;
  }

}
