import { Test, TestingModule } from '@nestjs/testing';
import { WardenService } from './warden.service';

describe('WardenService', () => {
  let service: WardenService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WardenService],
    }).compile();

    service = module.get<WardenService>(WardenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
