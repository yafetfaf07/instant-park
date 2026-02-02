import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import { PARKINGSTATUS } from '@prisma/client';

export class CreateParkingAvenueDto {
  @ApiProperty({
    description: 'Name of the parking avenue/lot',
    example: 'Downtown Central Parking',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Full physical address of the parking avenue',
    example: '123 Main Street, Nairobi, Kenya',
  })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({
    description:
      'Latitude coordinate of the parking location (as string for precision)',
    example: '-1.2921',
  })
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @ApiProperty({
    description:
      'Longitude coordinate of the parking location (as string for precision)',
    example: '36.8219',
  })
  @IsNotEmpty()
  @IsNumber()
  longitude: number;

  @ApiProperty({
    description: 'Operating hours of the parking avenue',
    example: '06:00-22:00',
  })
  @IsNotEmpty()
  @IsString()
  workingHrs: string;

  @ApiProperty({ description: 'Hourly rate in ETB', example: 50 })
  @IsNumber()
  @Min(0)
  hourlyRate: number;

  @ApiProperty({
    description: 'Total number of parking spots available in the avenue',
    example: 50,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  totalSpots: number;

  @ApiProperty({
    description: 'Current status of the parking avenue',
    enum: PARKINGSTATUS,
    example: PARKINGSTATUS.OPEN,
  })
  @IsEnum(PARKINGSTATUS)
  status: PARKINGSTATUS;

  @ApiProperty({
    description: 'Current number of parking spots available in the avenue',
    example: 10,
  })
  @IsInt()
  @Min(1)
  currentSpots: number;

  @ApiProperty({
    description: 'URL to the photo/image of the parking avenue',
    example: 'images/parking-central.jpg',
  })
  @IsNotEmpty()
  @IsString()
  photoUrl: string;
}
