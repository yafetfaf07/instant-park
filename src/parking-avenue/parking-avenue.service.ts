import { BadRequestException, ConflictException, Injectable, NotFoundException,  } from '@nestjs/common';
import { CreateParkingAvenueDto } from './dto/create-parking-avenue.dto';
import { UpdateParkingAvenueDto } from './dto/update-parking-avenue.dto';
import { DatabaseService } from '../database/database.service';
import { SearchParkingDto } from './dto/search-parking-avenue.dto';
import { ParkingAvenue } from '@prisma/client';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ParkingAvenueService {
  constructor(private readonly databaseService: DatabaseService) {}

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

    if (!parkingAvenueOwnerCheck.isVerified){
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
        SELECT id, name, address, latitude, longitude, status, hourlyRate, photoUrl
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

    return {
      message: 'Reservation initiated. Proceed to payment.',
      reservationId: reservation.id,
      bookingRef: reservation.bookingRef,
      totalPrice: reservation.totalPrice,
      status: reservation.status
    };
  }

  findAll() {
    return `This action returns all parkingAvenue`;
  }

  findOne(id: number) {
    return `This action returns a #${id} parkingAvenue`;
  }

  update(id: number, updateParkingAvenueDto: UpdateParkingAvenueDto) {
    return `This action updates a #${id} parkingAvenue`;
  }

  remove(id: number) {
    return `This action removes a #${id} parkingAvenue`;
  }
}
