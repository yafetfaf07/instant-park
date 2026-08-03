import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  @Min(1, { message: 'Rating must be at least 1' })
  @Max(5, { message: 'Rating cannot be more than 5' })
  @ApiProperty({ description: 'parking avenue rating' })
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiProperty({ description: 'parking avenue comment' })
  comment?: string;
}