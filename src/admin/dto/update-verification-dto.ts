import { IsBoolean, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; 

export class UpdateVerificationDto {
  @ApiProperty({
    description: 'The username of the parking avenue owner provider',
    example: 'username123',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'Provide true or false value',
    example: 'True',
    minLength: 8,
  })
  @IsBoolean()
  @IsNotEmpty()
  verificationUpdate: boolean;
}