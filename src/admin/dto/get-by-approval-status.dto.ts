import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; 
import { ApprovalStatus } from '@prisma/client';


export class GetByApprovalStatus{
    
    @ApiProperty({
        description: 'Approval status',
        enum: ApprovalStatus,
    })
    @IsEnum(ApprovalStatus)
    approvalStatus: ApprovalStatus;

    @IsOptional()
    @IsString()
    cursor?: string;
}