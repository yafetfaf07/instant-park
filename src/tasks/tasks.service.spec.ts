import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { DatabaseService } from '../database/database.service';
import { SmsService } from '../sms/sms.service';

describe('TasksService', () => {
  let service: TasksService;
  let db: any;
  let sms: any;

  const mockDb = {
    parkingAvenue: { findMany: jest.fn() },
    occupancyLog: { createMany: jest.fn() },
    reservation: { findMany: jest.fn(), update: jest.fn() },
  };

  const mockSms = { sendSms: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: SmsService, useValue: mockSms },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    db = module.get(DatabaseService);
    sms = module.get(SmsService);
  });

  afterEach(() => { jest.clearAllMocks(); });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendReservationReminders', () => {
    beforeAll(() => {
      jest.useFakeTimers().setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should find reservations needing reminder, send SMS, and update DB', async () => {
      const mockReservation = {
        id: 'res-1',
        userId: 'user-1',
        parkingAvenueId: 'ave-1',
        user: { firstName: 'John', phoneNo: '+1234567890' },
        parkingAvenue: { name: 'Central Park' },
      };

      db.reservation.findMany.mockResolvedValue([mockReservation]);
      sms.sendSms.mockResolvedValue(true);
      db.reservation.update.mockResolvedValue(true);

      await service.sendReservationReminders();

      const future14Min = new Date('2024-01-01T12:14:00Z');
      const future15Min = new Date('2024-01-01T12:15:00Z');

      expect(db.reservation.findMany).toHaveBeenCalledWith({
        where: {
          status: 'CONFIRMED',
          reminderSent: false,
          endTime: { gte: future14Min, lte: future15Min },
        },
        include: { user: true, parkingAvenue: true },
      });

      expect(sms.sendSms).toHaveBeenCalledWith(
        '+1234567890',
        'Hi John, your parking reservation at Central Park ends in 15 minutes. Please prepare to leave.'
      );

      expect(db.reservation.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { reminderSent: true },
      });
    });
  });
});
