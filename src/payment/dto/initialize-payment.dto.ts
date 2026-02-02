import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitializePaymentDto {
  @ApiProperty({ description: 'The ID of the pending reservation' })
  @IsString()
  @IsNotEmpty()
  reservationId: string;
}