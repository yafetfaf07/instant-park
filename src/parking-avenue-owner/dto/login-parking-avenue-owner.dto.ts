import { IsNotEmpty, IsString, MinLength} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; 

export class LoginParkingAvenueOwnerDto {
    
    @ApiProperty({
        description: 'The unique parking avenue owner username',
        example: 'username123',
    })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({
        description: 'The secure password for the parking avenue owner account.',
        example: 'P@ssword1234!',
        minLength: 8,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    password: string;
}
 