import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsString, Min,} from 'class-validator';


export class GetMyParkingAvenueDetailDto {
  @ApiProperty({
    description: 'parking avenue id',
    example: 'e7ceda3a-8a20-433e-b111-8a5a0bbfa2c2',
  })
  @IsNotEmpty()
  @IsString()
  id: string;
}