import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

describe('PaymentController', () => {
  let controller: PaymentController;
  let service: PaymentService;

  const mockPaymentService = {
    initializePayment: jest.fn(),
    confirmPayment: jest.fn(),
    processWebhook: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        { provide: PaymentService, useValue: mockPaymentService },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('initialize', () => {
    it('should call initializePayment from service', async () => {
      const dto = { reservationId: '1' } as any;
      mockPaymentService.initializePayment.mockResolvedValue({ checkout_url: 'http://url' });

      const result = await controller.initialize(dto);
      expect(result).toEqual({ checkout_url: 'http://url' });
      expect(service.initializePayment).toHaveBeenCalledWith(dto);
    });
  });

  describe('confirm', () => {
    it('should call confirmPayment from service', async () => {
      const dto = { reservationId: '1', transactionReference: 'tx-1' } as any;
      mockPaymentService.confirmPayment.mockResolvedValue({ message: 'confirmed' });

      const result = await controller.confirm(dto);
      expect(result).toEqual({ message: 'confirmed' });
      expect(service.confirmPayment).toHaveBeenCalledWith(dto);
    });
  });

  describe('handleWebhook', () => {
    it('should extract headers and body and pass them to processWebhook', async () => {
      const mockRawBody = Buffer.from(JSON.stringify({ tx_ref: '123' }));
      
      // Simulate an Express RawBodyRequest object
      const mockReq = {
        headers: {
          'x-chapa-signature': 'mock-signature-hash',
        },
        body: { tx_ref: '123' },
        rawBody: mockRawBody,
      } as any;

      mockPaymentService.processWebhook.mockResolvedValue({ status: 'success' });

      const result = await controller.handleWebhook(mockReq);

      expect(service.processWebhook).toHaveBeenCalledWith(
        { tx_ref: '123' },
        'mock-signature-hash',
        mockRawBody
      );
      expect(result).toEqual({ status: 'success' });
    });

    it('should fallback to chapa-signature if x-chapa-signature is missing', async () => {
      const mockReq = {
        headers: { 'chapa-signature': 'fallback-signature' }, // Fallback header
        body: {},
        rawBody: Buffer.from(''),
      } as any;

      await controller.handleWebhook(mockReq);

      expect(service.processWebhook).toHaveBeenCalledWith(
        {},
        'fallback-signature',
        expect.any(Buffer)
      );
    });
  });
});