import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class TasksService {
    private readonly logger = new Logger(TasksService.name);

    constructor(private readonly databaseService: DatabaseService) { }

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
}