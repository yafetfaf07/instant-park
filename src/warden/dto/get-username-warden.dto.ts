import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; 


export class GetUsernameWardenDto {
    
    @ApiProperty({
        description: 'Warden username',
        example: 'username123',
    })
    @IsString()
    username: string;
}