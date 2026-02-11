import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; 
import { ApprovalStatus } from '@prisma/client';


export class UpdateApprovalStatus {
    @ApiProperty({
        description: 'Id of parking avenue',
        example: '67eb055b-e428-4e16-83b1-1688e8f68924',
    })
    @IsString()
    id: string;

   @ApiProperty({
        description: 'Approval status',
        enum: ApprovalStatus,
    })
    @IsEnum(ApprovalStatus)
    approvalStatus: ApprovalStatus;
}