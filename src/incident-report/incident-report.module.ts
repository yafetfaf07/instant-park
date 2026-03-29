import { Module } from '@nestjs/common';
import { IncidentReportService } from './incident-report.service';
import { IncidentReportController } from './incident-report.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [IncidentReportController],
  providers: [IncidentReportService],
})
export class IncidentReportModule {}
