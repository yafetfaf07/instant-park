import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCheckInDto {
  @IsString()
  @IsNotEmpty()
  licensePlate: string;

  @IsString()
  @IsNotEmpty()
  parkingAvenueId: string;

  @IsString()
  @IsOptional()
  userId?: string; 
}
