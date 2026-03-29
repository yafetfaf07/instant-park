import { Test, TestingModule } from '@nestjs/testing';
import { IncidentReportService } from './incident-report.service';

describe('IncidentReportService', () => {
  let service: IncidentReportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IncidentReportService],
    }).compile();

    service = module.get<IncidentReportService>(IncidentReportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
