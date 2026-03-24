import { Test, TestingModule } from '@nestjs/testing';
import { ParkingAvenueService } from './parking-avenue.service';
import { DatabaseService } from '../database/database.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

describe('ParkingAvenueService', () => {
  let service: ParkingAvenueService;
  let db: any;
  let eventEmitter: EventEmitter2;

  const mockDb = {
    parkingAvenueOwner: { findUnique: jest.fn() },
    parkingAvenue: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    parkingAvenueImage: { create: jest.fn() },
    reservation: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    checkIn: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockEventEmitter = { emit: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParkingAvenueService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<ParkingAvenueService>(ParkingAvenueService);
    db = module.get(DatabaseService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    // Mock logger so 'this.logger.error' in verifyPayment doesn't crash the test
    service.logger = { error: jest.fn() };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto = { name: 'Park A', address: '123 St' } as any;

    it('should throw NotFoundException if owner not found', async () => {
      db.parkingAvenueOwner.findUnique.mockResolvedValue(null);
      await expect(service.create(dto, 'owner-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if owner is unverified', async () => {
      db.parkingAvenueOwner.findUnique.mockResolvedValue({ isVerified: 'UNDERREVIEW' });
      await expect(service.create(dto, 'owner-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if name is taken', async () => {
      db.parkingAvenueOwner.findUnique.mockResolvedValue({ isVerified: 'APPROVED' });
      db.parkingAvenue.findFirst.mockResolvedValue({ name: 'Park A' });
      await expect(service.create(dto, 'owner-1')).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if address is taken', async () => {
      db.parkingAvenueOwner.findUnique.mockResolvedValue({ isVerified: 'APPROVED' });
      db.parkingAvenue.findFirst.mockResolvedValue({ address: '123 St' });
      await expect(service.create(dto, 'owner-1')).rejects.toThrow(ConflictException);
    });

    it('should create parking avenue successfully', async () => {
      db.parkingAvenueOwner.findUnique.mockResolvedValue({ isVerified: 'APPROVED' });
      db.parkingAvenue.findFirst.mockResolvedValue(null);
      db.parkingAvenue.create.mockResolvedValue({ id: 'ave-1', ...dto });

      const result = await service.create(dto, 'owner-1');
      expect(result).toEqual({ id: 'ave-1', ...dto });
    });
  });

  describe('findNearby', () => {
    it('should return nearby parking avenues using $queryRaw', async () => {
      const mockResults = [{ id: 'ave-1', distance: 2.5 }];
      db.$queryRaw.mockResolvedValue(mockResults);

      const result = await service.findNearby({ latitude: 10, longitude: 10, radius: 5 } as any);
      expect(result).toEqual(mockResults);
    });
  });

  describe('createReservation', () => {
    const dto = { parkingAvenueId: 'ave-1', startTime: new Date(), durationHours: 2 } as any;

    it('should throw NotFoundException if spot not found', async () => {
      db.parkingAvenue.findUnique.mockResolvedValue(null);
      await expect(service.createReservation(dto, 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if fully booked', async () => {
      db.parkingAvenue.findUnique.mockResolvedValue({ currentSpots: 5 });
      db.reservation.count.mockResolvedValue(5); // 5 bookings = fully booked
      await expect(service.createReservation(dto, 'user-1')).rejects.toThrow(ConflictException);
    });

    it('should create reservation and emit event', async () => {
      db.parkingAvenue.findUnique.mockResolvedValue({ currentSpots: 10, hourlyRate: 50, name: 'Lot A' });
      db.reservation.count.mockResolvedValue(2);
      db.reservation.create.mockResolvedValue({
        id: 'res-1', bookingRef: 'REF-123', totalPrice: 100, status: 'PENDING'
      });

      const result = await service.createReservation(dto, 'user-1');
      expect(eventEmitter.emit).toHaveBeenCalledWith('live.activity', expect.any(Object));
      expect(result.bookingRef).toBe('REF-123');
      expect(result.totalPrice).toBe(100);
    });
  });

  describe('getReservations', () => {
    it('should return paginated reservations', async () => {
      db.parkingAvenue.findUnique.mockResolvedValue(true);
      db.reservation.findMany.mockResolvedValue([{ bookingRef: '123' }]);
      db.reservation.count.mockResolvedValue(1);

      const result = await service.getReservationsByAvenue('ave-1', { page: 1, limit: 10 });
      expect(result.data).toEqual([{ bookingRef: '123' }]);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('verifyPayment', () => {
    it('should throw NotFoundException if not found', async () => {
      db.reservation.findUnique.mockResolvedValue(null);
      await expect(service.verifyPayment('REF')).rejects.toThrow(NotFoundException);
      expect(service.logger.error).toHaveBeenCalled();
    });

    it('should return confirmed message', async () => {
      db.reservation.findUnique.mockResolvedValue({ status: 'CONFIRMED' });
      expect(await service.verifyPayment('REF')).toEqual({ message: 'reservation is confirmed' });
    });
  });

  describe('update & remove', () => {
    it('update should update successfully', async () => {
      db.parkingAvenueOwner.findUnique.mockResolvedValue(true);
      db.parkingAvenue.findUnique.mockResolvedValue(true);
      db.parkingAvenue.update.mockResolvedValue({ id: 'ave-1' });

      expect(await service.update('ave-1', {} as any, 'owner-1')).toEqual({ id: 'ave-1' });
    });

    it('remove should delete successfully', async () => {
      db.parkingAvenueOwner.findUnique.mockResolvedValue(true);
      db.parkingAvenue.findUnique.mockResolvedValue(true);
      db.parkingAvenue.delete.mockResolvedValue(true);

      await expect(service.remove('ave-1', 'owner-1')).resolves.not.toThrow();
    });
  });
});