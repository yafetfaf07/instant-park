import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateCheckInDto } from './dto/create-check-in.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class CheckInService {
    constructor(private readonly databaseService: DatabaseService) { }

    async create(dto: CreateCheckInDto) {
        const existingCheckIn = await this.databaseService.checkIn.findUnique({
            where: { licensePlate: dto.licensePlate },
        });

        if (existingCheckIn) {
            throw new ConflictException('Vehicle is already checked in.');
        }

        return this.databaseService.$transaction(async (tx) => {
            const avenue = await tx.parkingAvenue.findUnique({
                where: { id: dto.parkingAvenueId },
                select: { currentSpots: true },
            });

            if (!avenue) {
                throw new BadRequestException('Parking avenue not found.');
            }

            if (avenue.currentSpots <= 0) {
                throw new BadRequestException('Parking avenue is currently full.');
            }

            await tx.parkingAvenue.update({
                where: { id: dto.parkingAvenueId },
                data: {
                    currentSpots: { decrement: 1 },
                },
            });

            return tx.checkIn.create({
                data: {
                    licensePlate: dto.licensePlate,
                    parkingAvenueId: dto.parkingAvenueId,
                    userId: dto.userId ?? null, //TODO: check if the user actually exists
                },
            });
        });
    }

    async getCheckInDetails(licensePlate: string) {
        const checkIn = await this.databaseService.checkIn.findUnique({
            where: { licensePlate },
            include: {
                parkingAvenue: {
                    select: {
                        hourlyRate: true,
                    }
                }
            },
        });

        if (!checkIn) {
            throw new NotFoundException(`No active check-in for plate: ${licensePlate}`);
        }

        const now = new Date();
        const entryTime = new Date(checkIn.createdAt);
        const diffInMs = now.getTime() - entryTime.getTime();

        const hoursStayed = Math.max(1, Math.ceil(diffInMs / (1000 * 60 * 60)));
        const totalPrice = hoursStayed * checkIn.parkingAvenue.hourlyRate;

        return {
            licensePlate: checkIn.licensePlate,
            entryTime: checkIn.createdAt,
            currentTime: now,
            hourlyRate: checkIn.parkingAvenue.hourlyRate,
            hoursStayed,
            totalPrice,
        };
    }

    async checkOut(licensePlate: string) {
        const checkIn = await this.databaseService.checkIn.findUnique({
            where: { licensePlate },
        });

        if (!checkIn) {
            throw new NotFoundException(`No active check-in found for plate: ${licensePlate}`);
        }

        return this.databaseService.$transaction(async (tx) => {
            await tx.checkIn.delete({
                where: { id: checkIn.id },
            });

            const updatedAvenue = await tx.parkingAvenue.update({
                where: { id: checkIn.parkingAvenueId },
                data: {
                    currentSpots: { increment: 1 },
                },
            });

            return {
                message: 'Check-out successful',
                licensePlate,
                availableSpots: updatedAvenue.currentSpots,
            };
        });
    }
}
