import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; 

export class CreateAdminDto {
  @ApiProperty({
    description: 'The unique administrative username used for login.',
    example: 'super_admin_1',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: 'The secure password for the admin account.',
    example: 'P@ssword1234!',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}