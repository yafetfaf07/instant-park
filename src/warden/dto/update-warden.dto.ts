import { PartialType } from '@nestjs/swagger';
import { CreateWardenDto } from './create-warden.dto';

export class UpdateWardenDto extends PartialType(CreateWardenDto) {}
