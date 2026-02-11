import { BadRequestException, ConflictException, Injectable, NotFoundException, } from '@nestjs/common';
import { CreateParkingAvenueDto } from './dto/create-parking-avenue.dto';
import { UpdateParkingAvenueDto } from './dto/update-parking-avenue.dto';
import { DatabaseService } from '../database/database.service';
import { SearchParkingDto } from './dto/search-parking-avenue.dto';
import { ParkingAvenue } from '@prisma/client';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { v4 as uuidv4 } from 'uuid';
import { GetReservationsDto } from './dto/get-reservations.dto';
import { GetCheckInsDto } from './dto/get-check-ins.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LiveActivityEvent } from 'src/admin/event/live-activity.event';

@Injectable()
export class ParkingAvenueService {
  logger: any;
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) { }

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

    if (!parkingAvenueOwnerCheck.isVerified) {
      throw new BadRequestException("Only Verified parking avenue owners can register parking avenues")
    }

    return this.databaseService.parkingAvenue.create({
      data: { ...createParkingAvenueDto, ownerId: userId },
    });
  }

  async findNearby(searchDto: SearchParkingDto) {
    const { latitude, longitude, radius } = searchDto;

    // 6371 is the radius of the Earth in km
    const results = await this.databaseService.$queryRaw<ParkingAvenue[]>`
        SELECT id, name, address, latitude, longitude, status, "hourlyRate", "photoUrl",
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

  async createReservation(dto: CreateReservationDto, userId: string) {
    const { parkingAvenueId, startTime, durationHours } = dto;
    const start = new Date(startTime);
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

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

    const reservation = await this.databaseService.reservation.create({
      data: {
        bookingRef,
        startTime: start,
        endTime: end,
        durationHours,
        totalPrice,
        status: 'PENDING',
        userId,
        parkingAvenueId,
      },
    });

    this.eventEmitter.emit( // emitting the event
      'live.activity', // event name
      new LiveActivityEvent(
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
  }

  async getReservations(parkingAvenueId: string, query: GetReservationsDto) {
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

  async verifyPayment(bookingRef: string) {
    const reservation = await this.databaseService.reservation.findUnique({
      where: { bookingRef: bookingRef },
    });

    if (!reservation) {
      this.logger.error(`Reservation with ref ${bookingRef} not found`);
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status === 'CONFIRMED') {
      return { message: 'reservation is confirmed' };
    } else {
      return { message: 'reservation not confirmed yet' };
    }
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
}
