import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { SmsService } from '../sms/sms.service';

@Injectable()
export class TasksService {
    private readonly logger = new Logger(TasksService.name);

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly smsService: SmsService,
    ) { }

    // @Cron(CronExpression.EVERY_10_SECONDS) // for testing only
    @Cron(CronExpression.EVERY_HOUR)
    async recordHourlyOccupancy() {
        this.logger.log('Starting hourly occupancy snapshot for AI dataset...');

        try {
            const avenues = await this.databaseService.parkingAvenue.findMany({
                select: {
                    id: true,
                    totalSpots: true,
                    currentSpots: true,
                },
            });

            if (avenues.length === 0) {
                this.logger.log('No parking avenues found to log.');
                return;
            }

            const logsToInsert = avenues.map((avenue) => {
                const occupiedSpots = avenue.totalSpots - avenue.currentSpots;
                const rate = avenue.totalSpots > 0 ? occupiedSpots / avenue.totalSpots : 0;
                const ts = new Date()
                const day = ts.getDay()

                return {
                    timestamp: ts,
                    parkingAvenueId: avenue.id,
                    hour: ts.getHours(),
                    dayOfWeek: day,
                    isWeekend: day > 5 ? 1 : 0,
                    totalSpots: avenue.totalSpots,
                    currentSpots: avenue.currentSpots,
                    occupancyRate: rate,
                };
            });

            await this.databaseService.occupancyLog.createMany({
                data: logsToInsert,
            });

            this.logger.log(`Successfully logged occupancy for ${avenues.length} parking avenues.`);
        } catch (error) {
            this.logger.error('Failed to record hourly occupancy', error.stack);
        }
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async sendReservationReminders() {
        this.logger.debug('Checking for reservations needing SMS reminders...');

        const now = new Date();
        const future14Min = new Date(now.getTime() + 14 * 60 * 1000);
        const future15Min = new Date(now.getTime() + 15 * 60 * 1000);

        try {
            const reservationsToRemind = await this.databaseService.reservation.findMany({
                where: {
                    status: 'CONFIRMED',
                    reminderSent: false,
                    endTime: {
                        gte: future14Min,
                        lte: future15Min,
                    },
                },
                include: {
                    user: true,
                    parkingAvenue: true,
                },
            });

            if (reservationsToRemind.length === 0) {
                return;
            }

            this.logger.log(`Found ${reservationsToRemind.length} reservations to remind.`);

            for (const reservation of reservationsToRemind) {
                const phoneNo = reservation.user?.phoneNo;
                if (!phoneNo) {
                    this.logger.warn(`User ${reservation.userId} missing phoneNo. Skipping SMS.`);
                    continue;
                }

                const message = `Hi ${reservation.user.firstName}, your parking reservation at ${reservation.parkingAvenue.name} ends in 15 minutes. Please prepare to leave.`;

                const sent = await this.smsService.sendSms(phoneNo, message);

                if (sent) {
                    await this.databaseService.reservation.update({
                        where: { id: reservation.id },
                        data: { reminderSent: true },
                    });
                }
            }
        } catch (error) {
            this.logger.error('Failed to process reservation reminders', error.stack);
        }
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async cleanupStaleTempAccounts() {
        try {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

            const result = await this.databaseService.temp.deleteMany({
                where: {
                    createdAt: {
                        lte: fiveMinutesAgo, 
                    },
                },
            });

            if (result.count > 0) {
                this.logger.log(`Cleaned up ${result.count} expired OTP records from the Temp table.`);
            }
        } catch (error) {
            this.logger.error('Failed to execute Temp table cleanup cron job', error.stack);
        }
    }
}