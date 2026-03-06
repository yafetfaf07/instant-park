import { ApiProperty } from "@nestjs/swagger";
import type { ParkingAvenue } from "@prisma/client";
import { IsNotEmpty } from "class-validator";

export class GetParkingAvenueDetailDto {
  @ApiProperty({
    description: 'parking avenue object',
  })
  @IsNotEmpty()
  parkingAvenue: ParkingAvenue;

  
}