import { IsNotEmpty, IsString, Allow } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; 

export class CreateParkingAvenueImageDto {
    
    @ApiProperty({
        description: 'Enter parking avenue id',
        example: 'e7ceda3a-8a20-433e-b111-8a5a0bbfa2c2',
    })
    @IsNotEmpty()
    @IsString()
    parkingAvenueId: string;

    @ApiProperty({
        format: 'binary'
    })
    @Allow()
    photosUrl: string
}