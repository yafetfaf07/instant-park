import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateParkingAvenueDto } from './create-parking-avenue.dto';

export class UpdateParkingAvenueDto extends PartialType(
    OmitType(CreateParkingAvenueDto, ['address', 'latitude', 'longitude', 'subCity', 'legalDoc'] as const),
) { }
