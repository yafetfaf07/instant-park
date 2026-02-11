import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; 


export class GetPhoneNoWardenDto {
    
    @ApiProperty({
        description: 'Warden Phone no',
        example: '+251934567890',
    })
    @IsString()
    phoneNo: string;
}