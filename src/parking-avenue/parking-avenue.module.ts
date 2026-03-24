import { Module } from '@nestjs/common';
import { ParkingAvenueService } from './parking-avenue.service';
import { ParkingAvenueController } from './parking-avenue.controller';
import { DatabaseModule } from 'src/database/database.module';
import { CheckInService } from 'src/check-in/check-in.service';


@Module({
  imports: [ DatabaseModule],
  controllers: [ParkingAvenueController],
  providers: [ParkingAvenueService, CheckInService],
})
export class ParkingAvenueModule {}
