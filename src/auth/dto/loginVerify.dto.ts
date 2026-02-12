import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginVerifyDto {
  @ApiProperty({
    description: 'Phone number',
    example: '+1234567890',
  })
  @IsString()
  phoneNo: string;

  @ApiProperty({
    description: 'otp value',
    example: '0987',
  })
  @IsString()
  otp: string;

  @ApiProperty({
    description: 'location at the given time of login ',
    example: 'GPS Coordinates',
  })
  @IsNotEmpty()
  @IsString()
  location: string;

}