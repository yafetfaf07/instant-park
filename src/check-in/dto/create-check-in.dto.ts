import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCheckInDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'license plate' })
  licensePlate: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'avenue id' })
  parkingAvenueId: string;

  @IsString()
  @IsOptional()
  userId?: string; 


  @IsString()
  @IsOptional()
  @ApiProperty({ description: 'reservation id' })
  reservationId?: string; 
}
