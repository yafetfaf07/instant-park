import { IsEnum, IsOptional } from 'class-validator';
import { ParkingAvenueType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class FilterParkingDto {
  @ApiProperty({ enum: ParkingAvenueType, required: false })
  @IsOptional()
  @IsEnum(ParkingAvenueType)
  type?: ParkingAvenueType;
}