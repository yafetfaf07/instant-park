import { PartialType } from '@nestjs/swagger';
import { CreateIncidentReportDto } from './create-incident-report.dto';

export class UpdateIncidentReportDto extends PartialType(CreateIncidentReportDto) {}
