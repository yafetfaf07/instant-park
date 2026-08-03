import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { DatabaseModule } from 'src/database/database.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { JwtStrategy } from 'src/auth/guards/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { EmailModule } from 'src/email/email.module';
import { ParkingAvenueOwnerModule } from 'src/parking-avenue-owner/parking-avenue-owner.module';
import { ParkingAvenueModule } from 'src/parking-avenue/parking-avenue.module';
import { AiInsightService } from 'src/ai-analytics/ai-insight.service';
import { WardenModule } from 'src/warden/warden.module';

@Module({
  imports: [
    WardenModule,
    ParkingAvenueModule,
    ParkingAvenueOwnerModule,
    EmailModule,
    DatabaseModule,
    PassportModule,
    ConfigModule, 
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const jwtSecret = configService.get<string>('JWT_SECRET');
        if (!jwtSecret) {
          throw new Error(
            'FATAL: JWT_SECRET is missing from environment variables.',
          );
        }
        return {
          secret: jwtSecret,
          signOptions: { expiresIn: '7d' }, 
        };
      },
      inject: [ConfigService],
    }),
  ],

  controllers: [AdminController],
  providers: [AdminService, AiInsightService],
})
export class AdminModule {}
