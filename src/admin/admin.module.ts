import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { DatabaseModule } from 'src/database/database.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { JwtStrategy } from 'src/auth/guards/jwt.strategy';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
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
  providers: [AdminService],
})
export class AdminModule {}
