import { IsInt, IsNotEmpty, IsDateString, Min, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReservationDto {
  @ApiProperty({ description: 'ID of the parking avenue', example: 1 })
  @IsNotEmpty()
  @IsString()
  parkingAvenueId: string;

  @ApiProperty({ description: 'Start time (ISO 8601)', example: '2024-05-20T14:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ description: 'Duration in hours', example: 2 })
  @IsInt()
  @Min(1)
  durationHours: number;

  @ApiProperty({ description: 'plate number of the customer', example: 2 })
  @IsString()
  @IsNotEmpty()
  plateNumber: string;
}