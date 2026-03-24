import { Module } from '@nestjs/common';
import { CheckInController } from './check-in.controller';
import { CheckInService } from './check-in.service';
import { DatabaseModule } from 'src/database/database.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [DatabaseModule, PaymentModule],
  controllers: [CheckInController],
  providers: [CheckInService]
})
export class CheckInModule { }
