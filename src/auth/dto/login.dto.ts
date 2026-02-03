import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
@ApiProperty({
    description: 'Phone number',
    example: '+1234567890',
  })
  @IsString()
  phoneNo: string;


}