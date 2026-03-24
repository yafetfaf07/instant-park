import { IsNotEmpty, IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; 

export class ResetPasswordDto {
    
    @ApiProperty({
        description: 'Email of parking avenue owner',
        example: 'john@gmail.com',
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        description: 'Token you received via email',
        example: '126466',
    })
    @IsString()
    @IsNotEmpty()
    token: string;

    
    @ApiProperty({
        description: 'The new password for the parking avenue owner account.',
        example: 'P@ssword1234!',
        minLength: 8,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    newPassword: string;


}
