import { IsNotEmpty, IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; 

export class ForgotPasswordDto {
    
    @ApiProperty({
        description: 'Email of parking avenue owner',
        example: 'john@gmail.com',
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;


}
