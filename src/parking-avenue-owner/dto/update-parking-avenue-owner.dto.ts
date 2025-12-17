import { PartialType } from '@nestjs/swagger';
import { CreateParkingAvenueOwnerDto } from './create-parking-avenue-owner.dto';

export class UpdateParkingAvenueOwnerDto extends PartialType(CreateParkingAvenueOwnerDto) {}
