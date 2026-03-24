import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateCheckInDto } from './dto/create-check-in.dto';
import { DatabaseService } from '../database/database.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LiveActivityEvent } from '../event/live-activity.event';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class CheckInService {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly eventEmitter: EventEmitter2,
        private readonly paymentService: PaymentService,
    ) { }

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
                select: {
                    name: true,
                    currentSpots: true,
                },
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

            this.eventEmitter.emit(
                'live.activity',
                new LiveActivityEvent(
                    dto.parkingAvenueId,
                    'WALK_IN',
                    `Vehicle ${dto.licensePlate} entered ${avenue.name}`,
                    new Date(),
                    { plate: dto.licensePlate }
                )
            );

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
            include: {
                parkingAvenue: {
                    select: {
                        hourlyRate: true,
                    }
                }
            }
        });

        if (!checkIn) {
            throw new NotFoundException(`No active check-in found for plate: ${licensePlate}`);
        }

        const now = new Date();
        const entryTime = new Date(checkIn.createdAt);
        const diffInMs = now.getTime() - entryTime.getTime();
        const hoursStayed = Math.max(1, Math.ceil(diffInMs / (1000 * 60 * 60)));
        const totalPrice = hoursStayed * checkIn.parkingAvenue.hourlyRate;
        const tx_ref = `walkin-${licensePlate}-${Date.now()}`;

        const paymentInit = await this.paymentService.initializeWalkInPayment(totalPrice, licensePlate, tx_ref);

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
                totalPrice,
                hoursStayed,
                hourlyRate: checkIn.parkingAvenue.hourlyRate,
                checkoutUrl: paymentInit.checkout_url,
            };
        });
    }
}
