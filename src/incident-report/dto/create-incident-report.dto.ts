import { IsEnum, IsNotEmpty, IsString, IsUUID } from "class-validator";
import { ReportCategory } from "@prisma/client";
import { ApiProperty } from "@nestjs/swagger";


export class CreateIncidentReportDto {
  
@ApiProperty({
    description: 'The category classification of the incident',
    enum: ReportCategory,
    example: ReportCategory.ACCIDENT, 
  })
  @IsEnum(ReportCategory)
  category: ReportCategory;

  @ApiProperty({
    description: 'Detailed reason or description of the incident',
    example: 'Unauthorized vehicle blocking the emergency exit.',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    description: 'The unique identifier (UUID) of the parking avenue',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  parkingAvenueId: string;

}
