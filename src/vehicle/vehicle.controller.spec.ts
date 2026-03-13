import { Test, TestingModule } from '@nestjs/testing';
import { VehicleController } from './vehicle.controller';
import { VehicleService } from './vehicle.service';

describe('VehicleController', () => {
  let controller: VehicleController;
  let service: VehicleService;

  // Mock Request Object mimicking Express RequestWithUser
  const mockReq = {
    user: { id: 'user-123' },
  } as any;

  const mockVehicleService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehicleController],
      providers: [
        { provide: VehicleService, useValue: mockVehicleService },
      ],
    }).compile();

    controller = module.get<VehicleController>(VehicleController);
    service = module.get<VehicleService>(VehicleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with DTO and user ID', async () => {
      const dto = { licensePlate: 'ABC-123', make: 'Toyota' } as any;
      mockVehicleService.create.mockResolvedValue({ id: 'veh-1', ...dto });

      const result = await controller.create(dto, mockReq);

      expect(result).toEqual({ id: 'veh-1', ...dto });
      expect(service.create).toHaveBeenCalledWith(dto, 'user-123');
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with user ID', async () => {
      const mockVehicles = [{ licensePlate: 'ABC-123' }];
      mockVehicleService.findAll.mockResolvedValue(mockVehicles);

      const result = await controller.findAll(mockReq);

      expect(result).toEqual(mockVehicles);
      expect(service.findAll).toHaveBeenCalledWith('user-123');
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with license plate and user ID', async () => {
      const mockVehicle = { licensePlate: 'ABC-123' };
      mockVehicleService.findOne.mockResolvedValue(mockVehicle);

      const result = await controller.findOne('ABC-123', mockReq);

      expect(result).toEqual(mockVehicle);
      expect(service.findOne).toHaveBeenCalledWith('ABC-123', 'user-123');
    });
  });

  describe('remove', () => {
    it('should call service.remove with license plate and user ID', async () => {
      mockVehicleService.remove.mockResolvedValue(undefined); // Returning void

      await controller.remove('ABC-123', mockReq);

      expect(service.remove).toHaveBeenCalledWith('ABC-123', 'user-123');
    });
  });
});