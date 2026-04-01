import { Module } from '@nestjs/common';
import { WardenService } from './warden.service';
import { WardenController } from './warden.controller';
import { DatabaseModule } from 'src/database/database.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';


@Module({
  imports: [
    HttpModule,
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
  controllers: [WardenController],
  providers: [WardenService],
  exports: [WardenService]
})
export class WardenModule {}
