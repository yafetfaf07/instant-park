import { IsString, MinLength } from "class-validator";
import { ApiProperty } from '@nestjs/swagger';

export class CreateVehicleDto {

    @ApiProperty({
        description: 'Enter license plate based on the example format',
        example: "2AA23567"
    })
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @IsString()
    licensePlate: string;

}
