import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; 
import { Gender, WardenStatus } from '@prisma/client';


export class CreateWardenDto {

    @ApiProperty({
        description: 'Warden first name',
        example: 'John',
    })
    @IsNotEmpty()
    @IsString()
    firstName: string;

    @ApiProperty({
        description: 'Warden last name',
        example: 'Doe',
    })
    @IsNotEmpty()
    @IsString()
    lastName: string;

    @ApiProperty({
        description: 'Warden username',
        example: 'username123',
    })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({
        description: 'Phone number',
        example: '+251934567890',
    })
    @IsOptional()
    @IsString()
    phoneNo: string;

    @ApiProperty({
        description: 'Warden gender',
        enum: Gender,
        example: Gender.MALE,
      })
    @IsNotEmpty()
    @IsEnum(Gender)
    gender: Gender;

    @ApiProperty({
        description: 'Warden gender',
        enum: WardenStatus,
        example: WardenStatus.OFFDUTY,
      })
    @IsNotEmpty()
    @IsEnum(WardenStatus)
    wardenStatus: WardenStatus;

    @ApiProperty({
        description: 'Warden location at the given time ',
        example: 'GPS Coordinates',
    })
    @IsNotEmpty()
    @IsString()
    currentLocation: string;

    @ApiProperty({
        description: 'Warden\'s primary residence.',
        example: 'Bole Bula',
    })
    @IsNotEmpty()
    @IsString()
    residenceArea: string;

    @ApiProperty({
        description: 'Enter parking avenue id',
        example: 'e7ceda3a-8a20-433e-b111-8a5a0bbfa2c2',
    })
    @IsNotEmpty()
    @IsString()
    parkingAvenueId: string;
}
