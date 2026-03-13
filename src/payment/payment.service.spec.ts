import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { DatabaseService } from '../database/database.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

// Mock external dependencies
jest.mock('axios');
jest.mock('qrcode');

describe('PaymentService', () => {
  let service: PaymentService;
  let db: any;

  const mockDb = {
    reservation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
    },
  };

  const originalEnv = process.env;

  beforeEach(async () => {
    // Reset env variables before each test
    process.env = { ...originalEnv, CHAPA_SECRET_KEY: 'test-secret', CALLBACK_URL: 'http://callback.com' };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    db = module.get(DatabaseService);

    // Mock logger to avoid cluttering test output
    (service as any).logger = { error: jest.fn(), warn: jest.fn(), log: jest.fn() };
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env = originalEnv;
  });

  describe('initializePayment', () => {
    const dto = { reservationId: 'res-1' } as any;

    it('should throw NotFoundException if reservation not found', async () => {
      db.reservation.findUnique.mockResolvedValue(null);
      await expect(service.initializePayment(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already confirmed', async () => {
      db.reservation.findUnique.mockResolvedValue({ status: 'CONFIRMED' });
      await expect(service.initializePayment(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user not found', async () => {
      db.reservation.findUnique.mockResolvedValue({ id: 'res-1', status: 'PENDING', userId: 'user-1', totalPrice: 100 });
      db.reservation.update.mockResolvedValue(true);
      db.customer.findUnique.mockResolvedValue(null);

      await expect(service.initializePayment(dto)).rejects.toThrow(NotFoundException);
    });

    it('should initialize payment via Chapa and return checkout_url', async () => {
      db.reservation.findUnique.mockResolvedValue({ id: 'res-1', bookingRef: 'REF-1', status: 'PENDING', userId: 'user-1', totalPrice: 100 });
      db.reservation.update.mockResolvedValue(true);
      db.customer.findUnique.mockResolvedValue({ firstName: 'John', lastName: 'Doe', phoneNo: '123' });
      
      (axios.post as jest.Mock).mockResolvedValue({ data: { data: { checkout_url: 'http://chapa.co/pay' } } });

      const result = await service.initializePayment(dto);
      expect(result).toEqual({ checkout_url: 'http://chapa.co/pay' });
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.chapa.co/v1/transaction/initialize',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should catch axios error and throw BadRequestException', async () => {
      db.reservation.findUnique.mockResolvedValue({ id: 'res-1', status: 'PENDING', userId: 'user-1', totalPrice: 100 });
      db.customer.findUnique.mockResolvedValue({ firstName: 'John' });
      (axios.post as jest.Mock).mockRejectedValue(new Error('Chapa Failed'));

      await expect(service.initializePayment(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmPayment', () => {
    const dto = { reservationId: 'res-1', transactionReference: 'TX-123' };

    it('should throw NotFoundException if reservation not found', async () => {
      db.reservation.findUnique.mockResolvedValue(null);
      await expect(service.confirmPayment(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already confirmed', async () => {
      db.reservation.findUnique.mockResolvedValue({ status: 'CONFIRMED' });
      await expect(service.confirmPayment(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if chapa verification fails', async () => {
      db.reservation.findUnique.mockResolvedValue({ status: 'PENDING' });
      (axios.get as jest.Mock).mockResolvedValue({ data: { status: 'failed' } });

      await expect(service.confirmPayment(dto)).rejects.toThrow(BadRequestException);
    });

    it('should confirm payment, generate QR, and update DB', async () => {
      db.reservation.findUnique.mockResolvedValue({ id: 'res-1', bookingRef: 'REF-1', status: 'PENDING' });
      (axios.get as jest.Mock).mockResolvedValue({ data: { status: 'success' } });
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,qr-code-data');
      db.reservation.update.mockResolvedValue({ bookingRef: 'REF-1', qrCode: 'data:image/png;base64,qr-code-data', status: 'CONFIRMED' });

      const result = await service.confirmPayment(dto);

      expect(QRCode.toDataURL).toHaveBeenCalledWith(JSON.stringify({ ref: 'REF-1' }));
      expect(result).toEqual({
        message: 'Payment confirmed and reservation secured',
        bookingReference: 'REF-1',
        qrCode: 'data:image/png;base64,qr-code-data',
        status: 'CONFIRMED',
      });
    });
  });

  describe('processWebhook', () => {
    const rawBody = Buffer.from(JSON.stringify({ status: 'success', tx_ref: 'TX-123' }));
    const payload = JSON.parse(rawBody.toString());

    // Generate valid HMAC signature for tests
    const validSignature = crypto.createHmac('sha256', 'test-secret').update(rawBody).digest('hex');

    it('should throw Error if CHAPA_SECRET_KEY is missing', async () => {
      delete process.env.CHAPA_SECRET_KEY;
      await expect(service.processWebhook(payload, validSignature, rawBody)).rejects.toThrow('CHAPA_SECRET_KEY is not defined');
    });

    it('should throw ForbiddenException if signature is missing', async () => {
      await expect(service.processWebhook(payload, undefined, rawBody)).rejects.toThrow(ForbiddenException);
    });

    it('should return early if payment status is not success', async () => {
      const failedPayload = { status: 'failed', tx_ref: 'TX-1' } as any;
      const sig = crypto.createHmac('sha256', 'test-secret').update(JSON.stringify(failedPayload)).digest('hex');
      
      const result = await service.processWebhook(failedPayload, sig, Buffer.from(JSON.stringify(failedPayload)));
      expect(result).toEqual({ message: 'Ignored: Payment not successful' });
    });

    it('should return early if tx_ref is missing', async () => {
      const noTxPayload = { status: 'success' } as any;
      const sig = crypto.createHmac('sha256', 'test-secret').update(JSON.stringify(noTxPayload)).digest('hex');
      
      const result = await service.processWebhook(noTxPayload, sig, Buffer.from(JSON.stringify(noTxPayload)));
      expect(result).toBeUndefined();
    });

    it('should throw NotFoundException if reservation not found by tx_ref', async () => {
      db.reservation.findUnique.mockResolvedValue(null);
      await expect(service.processWebhook(payload, validSignature, rawBody)).rejects.toThrow(NotFoundException);
    });

    it('should return early if reservation is already confirmed', async () => {
      db.reservation.findUnique.mockResolvedValue({ status: 'CONFIRMED' });
      const result = await service.processWebhook(payload, validSignature, rawBody);
      expect(result).toEqual({ message: 'Already confirmed' });
    });

    it('should process webhook, generate QR code, and update DB successfully', async () => {
      db.reservation.findUnique.mockResolvedValue({ id: 'res-1', bookingRef: 'REF-1', status: 'PENDING' });
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('data:image/png;base64,webhook-qr');
      db.reservation.update.mockResolvedValue(true);

      const result = await service.processWebhook(payload, validSignature, rawBody);

      expect(QRCode.toDataURL).toHaveBeenCalledWith(JSON.stringify({ ref: 'REF-1' }));
      expect(db.reservation.update).toHaveBeenCalledWith({
        where: { id: 'res-1' },
        data: { status: 'CONFIRMED', qrCode: 'data:image/png;base64,webhook-qr' },
      });
      expect(result).toEqual({ status: 'success' });
    });
  });
});