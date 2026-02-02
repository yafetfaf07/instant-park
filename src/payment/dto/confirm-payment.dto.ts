import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmPaymentDto {
  @ApiProperty({ description: 'The ID of the local reservation', example: 15 })
  @IsString()
  @IsNotEmpty()
  reservationId: string;

  @ApiProperty({ description: 'Transaction reference from Chapa', example: 'tx-123456' })
  @IsString()
  @IsNotEmpty()
  transactionReference: string;
}