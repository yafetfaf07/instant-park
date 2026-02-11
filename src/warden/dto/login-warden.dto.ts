import { IsNotEmpty, IsString} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; 



export class LoginWardenDto {


    @ApiProperty({
        description: 'Warden username',
        example: 'username123',
    })
    @IsString()
    @IsNotEmpty()
    username: string;
}