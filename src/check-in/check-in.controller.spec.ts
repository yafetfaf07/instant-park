import { Test, TestingModule } from '@nestjs/testing';
import { CheckInController } from './check-in.controller';
import { CheckInService } from './check-in.service';

describe('CheckInController', () => {
  let controller: CheckInController;
  let service: CheckInService;

  const mockCheckInService = {
    create: jest.fn(),
    getCheckInDetails: jest.fn(),
    checkOut: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckInController],
      providers: [
        { provide: CheckInService, useValue: mockCheckInService },
      ],
    }).compile();

    controller = module.get<CheckInController>(CheckInController);
    service = module.get<CheckInService>(CheckInService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('checkIn', () => {
    it('should call checkInService.create', async () => {
      const dto = { licensePlate: 'ABC-123', parkingAvenueId: 'ave-1' } as any;
      mockCheckInService.create.mockResolvedValue({ id: 'checkin-1', ...dto });

      const result = await controller.checkIn(dto);

      expect(result).toEqual({ id: 'checkin-1', ...dto });
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('getDetails', () => {
    it('should call checkInService.getCheckInDetails', async () => {
      const mockDetails = { licensePlate: 'ABC-123', totalPrice: 100 };
      mockCheckInService.getCheckInDetails.mockResolvedValue(mockDetails);

      const result = await controller.getDetails('ABC-123');

      expect(result).toEqual(mockDetails);
      expect(service.getCheckInDetails).toHaveBeenCalledWith('ABC-123');
    });
  });

  describe('checkOut', () => {
    it('should call checkInService.checkOut', async () => {
      const mockCheckoutResponse = { message: 'Check-out successful', availableSpots: 10 };
      mockCheckInService.checkOut.mockResolvedValue(mockCheckoutResponse);

      const result = await controller.checkOut('ABC-123');

      expect(result).toEqual(mockCheckoutResponse);
      expect(service.checkOut).toHaveBeenCalledWith('ABC-123');
    });
  });
});