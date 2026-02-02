import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ParkingAvenueModule } from './parking-avenue/parking-avenue.module';
import { AdminModule } from './admin/admin.module';
import { ParkingAvenueOwnerModule } from './parking-avenue-owner/parking-avenue-owner.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [DatabaseModule, AuthModule, ParkingAvenueModule, AdminModule, ParkingAvenueOwnerModule, PaymentModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
