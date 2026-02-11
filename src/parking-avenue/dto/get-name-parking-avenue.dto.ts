import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; 


export class GetNameParkingAvenueDto{
    
    @ApiProperty({
        description: 'Name of the parking avenue/lot',
        example: 'Downtown Central Parking',
    })
    @IsString()
    name: string;
}