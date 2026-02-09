import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyDto {
@ApiProperty({
    description: 'otp value',
    example: '0987',
  })
  @IsString()
  otp: string;


}