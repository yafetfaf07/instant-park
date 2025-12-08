import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
@ApiProperty({
    description: 'Phone number',
    example: '+1234567890',
  })
  @IsOptional()
  @IsString()
  phoneNo: string;

  @ApiProperty({
    description: 'Password (will be hashed)',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsNotEmpty()
  @IsString()
  password: string;
}