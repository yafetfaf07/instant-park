import { Test, TestingModule } from '@nestjs/testing';
import { IncidentReportController } from './incident-report.controller';
import { IncidentReportService } from './incident-report.service';

describe('IncidentReportController', () => {
  let controller: IncidentReportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IncidentReportController],
      providers: [IncidentReportService],
    }).compile();

    controller = module.get<IncidentReportController>(IncidentReportController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
