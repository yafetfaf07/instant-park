import { Module } from '@nestjs/common';
import { ParkingAvenueOwnerService } from './parking-avenue-owner.service';
import { ParkingAvenueOwnerController } from './parking-avenue-owner.controller';
import { DatabaseModule } from 'src/database/database.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [
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
  controllers: [ParkingAvenueOwnerController],
  providers: [ParkingAvenueOwnerService],
})
export class ParkingAvenueOwnerModule {}
