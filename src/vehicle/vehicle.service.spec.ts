import { Test, TestingModule } from '@nestjs/testing';
import { VehicleService } from './vehicle.service';
import { DatabaseService } from '../database/database.service';
import { NotFoundException } from '@nestjs/common';

describe('VehicleService', () => {
  let service: VehicleService;
  let db: any;

  // Mock the Database Service
  const mockDb = {
    customer: {
      findUnique: jest.fn(),
    },
    vehicle: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<VehicleService>(VehicleService);
    db = module.get(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = { make: 'Toyota', model: 'Corolla', licensePlate: 'ABC-123' } as any;

    it('should throw NotFoundException if user does not exist', async () => {
      db.customer.findUnique.mockResolvedValue(null);
      await expect(service.create(dto, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should successfully create and return a vehicle', async () => {
      db.customer.findUnique.mockResolvedValue({ id: 'user-1' });
      db.vehicle.create.mockResolvedValue({ id: 'veh-1', ...dto, ownerId: 'user-1' });

      const result = await service.create(dto, 'user-1');

      expect(db.vehicle.create).toHaveBeenCalledWith({
        data: { ...dto, ownerId: 'user-1' },
      });
      expect(result).toEqual({ id: 'veh-1', ...dto, ownerId: 'user-1' });
    });
  });

  describe('findAll', () => {
    it('should return a list of vehicles for the given user', async () => {
      const mockVehicles = [{ id: 'veh-1', licensePlate: 'ABC-123' }];
      db.vehicle.findMany.mockResolvedValue(mockVehicles);

      const result = await service.findAll('user-1');

      expect(db.vehicle.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'user-1' },
      });
      expect(result).toEqual(mockVehicles);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if vehicle does not exist', async () => {
      db.vehicle.findUnique.mockResolvedValue(null);
      await expect(service.findOne('ABC-123', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should return a vehicle if found', async () => {
      const mockVehicle = { id: 'veh-1', licensePlate: 'ABC-123' };
      db.vehicle.findUnique.mockResolvedValue(mockVehicle);

      const result = await service.findOne('ABC-123', 'user-1');

      expect(db.vehicle.findUnique).toHaveBeenCalledWith({
        where: {
          ownerId_licensePlate: {
            ownerId: 'user-1',
            licensePlate: 'ABC-123',
          },
        },
      });
      expect(result).toEqual(mockVehicle);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if vehicle does not exist', async () => {
      db.vehicle.findUnique.mockResolvedValue(null);
      await expect(service.remove('ABC-123', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should successfully delete a vehicle', async () => {
      db.vehicle.findUnique.mockResolvedValue({ id: 'veh-1' });
      db.vehicle.delete.mockResolvedValue(true);

      await expect(service.remove('ABC-123', 'user-1')).resolves.not.toThrow();

      expect(db.vehicle.delete).toHaveBeenCalledWith({
        where: {
          ownerId_licensePlate: {
            ownerId: 'user-1',
            licensePlate: 'ABC-123',
          },
        },
      });
    });
  });
});