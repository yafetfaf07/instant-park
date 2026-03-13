import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { DatabaseService } from '../database/database.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

// Mock bcrypt so it doesn't actually hash passwords during tests
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AdminService', () => {
  let service: AdminService;
  let db: any;
  let jwtService: any;

  const mockDb = {
    admin: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    parkingAvenueOwner: {
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    parkingAvenue: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    customer: { count: jest.fn() },
    reservation: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockJwtService = { sign: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    db = module.get(DatabaseService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const dto = { username: 'admin1', password: 'password123' };

    it('should throw BadRequestException if password is < 8 chars', async () => {
      await expect(service.register({ ...dto, password: 'short' })).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if username exists', async () => {
      db.admin.findUnique.mockResolvedValue(true);
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should hash password and create admin successfully', async () => {
      db.admin.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      db.admin.create.mockResolvedValue({ id: 'admin-1', username: 'admin1' });

      const result = await service.register(dto);
      expect(result).toEqual({ admin: { username: 'admin1' }, message: 'Registration successful' });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });
  });

  describe('login', () => {
    const dto = { username: 'admin1', password: 'password123' };

    it('should throw BadRequestException if no username or password', async () => {
      await expect(service.login({ password: '123' } as any)).rejects.toThrow(BadRequestException);
      await expect(service.login({ username: 'admin1' } as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if admin not found', async () => {
      db.admin.findUnique.mockResolvedValue(null);
      await expect(service.login(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if password mismatch', async () => {
      db.admin.findUnique.mockResolvedValue({ id: 'admin-1', password: 'hashedPassword' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should login successfully, update lastLogin and return token', async () => {
      db.admin.findUnique.mockResolvedValue({ id: 'admin-1', password: 'hashed' });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login(dto);
      expect(db.admin.update).toHaveBeenCalled();
      expect(result).toEqual({ accessToken: 'jwt-token' });
    });
  });

  describe('parkingAvenueOwnerStatus', () => {
    it('should throw UnauthorizedException if admin not found', async () => {
      db.admin.findUnique.mockResolvedValue(null);
      await expect(service.parkingAvenueOwnerStatus({ approvalStatus: false } as any, 'admin-1')).rejects.toThrow(UnauthorizedException);
    });

    it('should return unverified owners list', async () => {
      db.admin.findUnique.mockResolvedValue(true);
      db.parkingAvenueOwner.findMany.mockResolvedValue([{ id: 'owner-1' }]);

      const result = await service.parkingAvenueOwnerStatus({ approvalStatus: false } as any, 'admin-1');
      expect(result).toEqual([{ id: 'owner-1' }]);
    });
  });

  describe('updateVerificationStatus', () => {
    it('should throw UnauthorizedException if admin not found', async () => {
      db.admin.findUnique.mockResolvedValue(null);
      await expect(service.updateVerificationStatus({} as any, 'admin-1')).rejects.toThrow(UnauthorizedException);
    });

    it('should update and return owner status', async () => {
      db.admin.findUnique.mockResolvedValue(true);
      db.parkingAvenueOwner.update.mockResolvedValue({ id: 'owner-1', isVerified: true });

      const result = await service.updateVerificationStatus({ username: 'user1', approvalStatus: true } as any, 'admin-1');
      expect(result).toEqual({ id: 'owner-1', isVerified: true });
    });
  });

  describe('getDashboardStats', () => {
    it('should return aggregated dashboard stats', async () => {
      db.parkingAvenueOwner.count.mockResolvedValue(10);
      db.parkingAvenue.count.mockResolvedValueOnce(20).mockResolvedValueOnce(5).mockResolvedValueOnce(15);
      db.customer.count.mockResolvedValue(50);
      db.reservation.count.mockResolvedValue(100);
      db.reservation.aggregate.mockResolvedValue({ _sum: { totalPrice: 5000 } });

      const result = await service.getDashboardStats();
      expect(result.cards).toEqual({
        totalProviders: 10,
        activeLocations: 20,
        onStreetSegments: 5,
        offStreetLots: 15,
        totalUsers: 50,
        activeReservations: 100,
        totalRevenue: 5000,
      });
    });
  });

  describe('getByApprovalStatus', () => {
    it('should throw NotFoundException if admin not found', async () => {
      db.admin.findUnique.mockResolvedValue(null);
      await expect(service.getByApprovalStatus({} as any, 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('should return avenues by status', async () => {
      db.admin.findUnique.mockResolvedValue(true);
      db.parkingAvenue.findMany.mockResolvedValue([{ id: 'ave-1' }]);

      const result = await service.getByApprovalStatus({ approvalStatus: 'APPROVED' } as any, 'admin-1');
      expect(result).toEqual([{ id: 'ave-1' }]);
    });
  });

  describe('updateApprovalStatus', () => {
    const dto = { id: 'ave-1', approvalStatus: 'APPROVED' } as any;

    it('should throw NotFoundException if admin not found', async () => {
      db.admin.findUnique.mockResolvedValue(null);
      await expect(service.updateApprovalStatus(dto, 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if parking avenue not found', async () => {
      db.admin.findUnique.mockResolvedValue(true);
      db.parkingAvenue.findUnique.mockResolvedValue(null);
      await expect(service.updateApprovalStatus(dto, 'admin-1')).rejects.toThrow(NotFoundException);
    });

    it('should update approval status successfully', async () => {
      db.admin.findUnique.mockResolvedValue(true);
      db.parkingAvenue.findUnique.mockResolvedValue(true);
      db.parkingAvenue.update.mockResolvedValue({ id: 'ave-1', approvalStatus: 'APPROVED' });

      const result = await service.updateApprovalStatus(dto, 'admin-1');
      expect(result).toEqual({ id: 'ave-1', approvalStatus: 'APPROVED' });
    });
  });

  describe('getGlobalOverview', () => {
    it('should throw NotFoundException if admin not found', async () => {
      db.admin.findUnique.mockResolvedValue(null);
      await expect(service.getGlobalOverview('admin-1')).rejects.toThrow(NotFoundException);
    });

    it('should return formatted global overview via transaction', async () => {
      db.admin.findUnique.mockResolvedValue(true);
      // Mock the Prisma $transaction returning an array of counts
      db.$transaction.mockResolvedValue([10, 20, 5, 15]);

      const result = await service.getGlobalOverview('admin-1');
      expect(result).toEqual({
        totalProviders: 10,
        activeLocations: 20,
        onStreetLots: 5,
        offStreetLots: 15,
      });
    });
  });

  describe('getParkingLotsStatus', () => {
    it('should calculate status string correctly based on capacity', async () => {
      db.parkingAvenue.findMany.mockResolvedValue([
        { name: 'Lot 1', address: 'A1', latitude: 1, longitude: 1, totalSpots: 10, currentSpots: 10 }, // FULL
        { name: 'Lot 2', address: 'A2', latitude: 2, longitude: 2, totalSpots: 10, currentSpots: 8 },  // HIGH_DEMAND
        { name: 'Lot 3', address: 'A3', latitude: 3, longitude: 3, totalSpots: 10, currentSpots: 5 },  // AVAILABLE
      ]);

      const result = await service.getParkingLotsStatus();
      expect(result[0].status).toBe('FULL');
      expect(result[1].status).toBe('HIGH_DEMAND');
      expect(result[2].status).toBe('AVAILABLE');
      expect(result[0].coordinates).toEqual({ lat: 1, lng: 1 });
    });
  });
});