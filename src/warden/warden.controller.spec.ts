import { Test, TestingModule } from '@nestjs/testing';
import { WardenController } from './warden.controller';
import { WardenService } from './warden.service';

describe('WardenController', () => {
  let controller: WardenController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WardenController],
      providers: [WardenService],
    }).compile();

    controller = module.get<WardenController>(WardenController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
