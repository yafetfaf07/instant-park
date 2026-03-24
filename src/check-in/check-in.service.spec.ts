import { Test, TestingModule } from '@nestjs/testing';
import { CheckInService } from './check-in.service';
import { DatabaseService } from '../database/database.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentService } from '../payment/payment.service';

describe('CheckInService', () => {
  let service: CheckInService;
  let db: any;
  let eventEmitter: EventEmitter2;
  let paymentService: any;

  // Mock the Database Service
  const mockDb = {
    checkIn: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    parkingAvenue: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    // Mock $transaction to immediately execute the callback passing our mockDb as the 'tx' object
    $transaction: jest.fn().mockImplementation(async (callback) => {
      return callback(mockDb);
    }),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockPaymentService = {
    initializeWalkInPayment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckInService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: PaymentService, useValue: mockPaymentService },
      ],
    }).compile();

    service = module.get<CheckInService>(CheckInService);
    db = module.get(DatabaseService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    paymentService = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = { licensePlate: 'ABC-123', parkingAvenueId: 'avenue-1', userId: 'user-1' } as any;

    it('should throw ConflictException if vehicle is already checked in', async () => {
      db.checkIn.findUnique.mockResolvedValue(true); // Simulating existing record

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(db.checkIn.findUnique).toHaveBeenCalledWith({ where: { licensePlate: 'ABC-123' } });
    });

    it('should throw BadRequestException if parking avenue is not found', async () => {
      db.checkIn.findUnique.mockResolvedValue(null);
      db.parkingAvenue.findUnique.mockResolvedValue(null); // Avenue not found inside tx

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if parking avenue is full', async () => {
      db.checkIn.findUnique.mockResolvedValue(null);
      db.parkingAvenue.findUnique.mockResolvedValue({ currentSpots: 0 }); // Full avenue

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should create check-in, decrement spots, and emit event', async () => {
      db.checkIn.findUnique.mockResolvedValue(null);
      db.parkingAvenue.findUnique.mockResolvedValue({ name: 'Central Park', currentSpots: 5 });
      db.parkingAvenue.update.mockResolvedValue({ currentSpots: 4 });
      db.checkIn.create.mockResolvedValue({ id: 'checkin-1', ...dto });

      const result = await service.create(dto);

      expect(db.parkingAvenue.update).toHaveBeenCalledWith({
        where: { id: dto.parkingAvenueId },
        data: { currentSpots: { decrement: 1 } },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('live.activity', expect.any(Object));
      expect(db.checkIn.create).toHaveBeenCalled();
      expect(result).toEqual({ id: 'checkin-1', ...dto });
    });
  });

  describe('getCheckInDetails', () => {
    beforeAll(() => {
      // Freeze time so new Date() always returns the exact same time during tests
      jest.useFakeTimers().setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should throw NotFoundException if check-in not found', async () => {
      db.checkIn.findUnique.mockResolvedValue(null);
      await expect(service.getCheckInDetails('XYZ-999')).rejects.toThrow(NotFoundException);
    });

    it('should calculate stay duration and total price correctly', async () => {
      const mockCheckIn = {
        licensePlate: 'ABC-123',
        createdAt: new Date('2024-01-01T10:00:00Z'), // Checked in 2 hours ago
        parkingAvenue: { hourlyRate: 50 },
      };

      db.checkIn.findUnique.mockResolvedValue(mockCheckIn);

      const result = await service.getCheckInDetails('ABC-123');

      expect(result.licensePlate).toBe('ABC-123');
      expect(result.hoursStayed).toBe(2); // 12:00 - 10:00 = 2 hours
      expect(result.hourlyRate).toBe(50);
      expect(result.totalPrice).toBe(100); // 2 hours * 50 rate
    });

    it('should round up partial hours to at least 1 hour', async () => {
      const mockCheckIn = {
        licensePlate: 'ABC-123',
        createdAt: new Date('2024-01-01T11:45:00Z'), // Checked in 15 mins ago
        parkingAvenue: { hourlyRate: 50 },
      };

      db.checkIn.findUnique.mockResolvedValue(mockCheckIn);

      const result = await service.getCheckInDetails('ABC-123');

      expect(result.hoursStayed).toBe(1); // 15 mins rounded up to 1 hour
      expect(result.totalPrice).toBe(50);
    });
  });

  describe('checkOut', () => {
    beforeAll(() => {
      jest.useFakeTimers().setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should throw NotFoundException if no active check-in', async () => {
      db.checkIn.findUnique.mockResolvedValue(null);
      await expect(service.checkOut('XYZ-999')).rejects.toThrow(NotFoundException);
    });

    it('should delete check-in, increment spots, and return price with checkoutUrl', async () => {
      const mockCheckIn = {
        id: 'checkin-1',
        parkingAvenueId: 'avenue-1',
        createdAt: new Date('2024-01-01T10:00:00Z'), // 2 hours ago
        parkingAvenue: { hourlyRate: 50 },
      };

      db.checkIn.findUnique.mockResolvedValue(mockCheckIn);
      db.checkIn.delete.mockResolvedValue(true);
      db.parkingAvenue.update.mockResolvedValue({ currentSpots: 10 });
      mockPaymentService.initializeWalkInPayment.mockResolvedValue({ checkout_url: 'http://checkout.chapa.co' });

      const result = await service.checkOut('ABC-123');

      expect(db.checkIn.delete).toHaveBeenCalledWith({ where: { id: 'checkin-1' } });
      expect(db.parkingAvenue.update).toHaveBeenCalledWith({
        where: { id: 'avenue-1' },
        data: { currentSpots: { increment: 1 } },
      });
      expect(mockPaymentService.initializeWalkInPayment).toHaveBeenCalledWith(
        100, // 2 hours * 50
        'ABC-123',
        expect.stringMatching(/^walkin-ABC-123-/)
      );

      expect(result).toEqual({
        message: 'Check-out successful',
        licensePlate: 'ABC-123',
        availableSpots: 10,
        totalPrice: 100,
        hoursStayed: 2,
        hourlyRate: 50,
        checkoutUrl: 'http://checkout.chapa.co',
      });
    });
  });
});