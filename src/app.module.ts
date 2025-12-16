import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ParkingAvenueModule } from './parking-avenue/parking-avenue.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [DatabaseModule, AuthModule, ParkingAvenueModule, AdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
