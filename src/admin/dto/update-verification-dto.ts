import { IsBoolean, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; 
import { ApprovalStatus } from '@prisma/client';

export class UpdateVerificationDto {
  @ApiProperty({
    description: 'The username of the parking avenue owner provider',
    example: 'username123',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

   @ApiProperty({
        description: 'Approval status',
        enum: ApprovalStatus,
    })
    @IsEnum(ApprovalStatus)
    approvalStatus: ApprovalStatus;
}