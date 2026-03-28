import { IsNotEmpty, IsString, MinLength, IsOptional, IsEmail, Allow } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; 

export class CreateParkingAvenueOwnerByAdminDto {
    
    @ApiProperty({
        description: 'Parking avenue owner first name',
        example: 'John',
    })
    @IsNotEmpty()
    @IsString()
    firstName: string;

    @ApiProperty({
        description: 'Parking avenue owner last name',
        example: 'Doe',
    })
    @IsNotEmpty()
    @IsString()
    lastName: string;
    
    @ApiProperty({
        description: 'The unique parking avenue owner username',
        example: 'username123',
    })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({
        description: 'Email of parking avenue owner',
        example: 'john@gmail.com',
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        description: 'Phone number',
        example: '+251934567890',
      })
    @IsString()
    phoneNo: string;

    @ApiProperty({
        format: 'binary'
    })
    @Allow()
    personalId: string
}
