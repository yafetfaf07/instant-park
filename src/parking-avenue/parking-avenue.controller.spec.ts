import { Test, TestingModule } from '@nestjs/testing';
import { ParkingAvenueController } from './parking-avenue.controller';
import { ParkingAvenueService } from './parking-avenue.service';
import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';

// Mock the Node 'fs' module so we don't accidentally delete real files during tests
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

describe('ParkingAvenueController', () => {
  let controller: ParkingAvenueController;
  let service: ParkingAvenueService;

  const mockService = {
    create: jest.fn(),
    getMyParkingAvenueList: jest.fn(),
    getMyParkingAvenueDetail: jest.fn(),
    getMyParkingAvenueImages: jest.fn(),
    findNearby: jest.fn(),
    getParkingAvenueByName: jest.fn(),
    createReservation: jest.fn(),
    getReservations: jest.fn(),
    verifyPayment: jest.fn(),
    getAvenueCheckIns: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addImage: jest.fn(),
  };

  const mockReq = { user: { id: 'owner-123' } } as any;

  // Helper to create a fake Multer file
  const createMockFile = (size: number, mimetype: string): Express.Multer.File => ({
    path: 'test/path/img.jpg',
    size,
    mimetype,
  } as any);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParkingAvenueController],
      providers: [{ provide: ParkingAvenueService, useValue: mockService }],
    }).compile();

    controller = module.get<ParkingAvenueController>(ParkingAvenueController);
    service = module.get<ParkingAvenueService>(ParkingAvenueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto = { name: 'Lot A' } as any;

    it('should throw BadRequestException if file is missing', () => {
      expect(() => controller.create(dto, undefined as any, mockReq)).toThrow(BadRequestException);
    });

    it('should clean up file and throw if file is too large (>2MB)', () => {
      const file = createMockFile(3 * 1024 * 1024, 'image/jpeg');
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      expect(() => controller.create(dto, file, mockReq)).toThrow(BadRequestException);
      expect(fs.unlinkSync).toHaveBeenCalledWith('test/path/img.jpg');
    });

    it('should clean up file and throw if invalid mimetype', () => {
      const file = createMockFile(1024, 'application/pdf'); // PDF not allowed
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      expect(() => controller.create(dto, file, mockReq)).toThrow(BadRequestException);
      expect(fs.unlinkSync).toHaveBeenCalledWith('test/path/img.jpg');
    });

    it('should call service.create successfully', async () => {
      const file = createMockFile(1024, 'image/png');
      mockService.create.mockResolvedValue({ id: 'ave-1' });

      const result = await controller.create(dto, file, mockReq);
      expect(result).toEqual({ id: 'ave-1' });
      expect(service.create).toHaveBeenCalledWith({ ...dto, legalDoc: file.path }, 'owner-123');
    });
  });

  describe('update', () => {
    const dto = { name: 'Lot B' } as any;

    it('should allow update without providing a new file', async () => {
      mockService.update.mockResolvedValue({ id: 'ave-1' });
      const result = await controller.update('ave-1', dto, undefined as any, mockReq);
      expect(result).toEqual({ id: 'ave-1' });
      expect(service.update).toHaveBeenCalledWith('ave-1', dto, 'owner-123');
    });

    it('should throw and cleanup if newly provided file is too large', () => {
      const file = createMockFile(3 * 1024 * 1024, 'image/jpeg');
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      expect(() => controller.update('ave-1', dto, file, mockReq)).toThrow(BadRequestException);
      expect(fs.unlinkSync).toHaveBeenCalledWith('test/path/img.jpg');
    });
  });

  describe('addImage', () => {
    const dto = { parkingAvenueId: 'ave-1' } as any;

    it('should throw if file missing', () => {
      expect(() => controller.addImage(dto, undefined as any, mockReq)).toThrow(BadRequestException);
    });

    it('should successfully add image', async () => {
      const file = createMockFile(1024, 'image/jpg');
      mockService.addImage.mockResolvedValue({ id: 'img-1' });

      const result = await controller.addImage(dto, file, mockReq);
      expect(result).toEqual({ id: 'img-1' });
      expect(service.addImage).toHaveBeenCalledWith({ ...dto, photosUrl: file.path }, 'owner-123');
    });
  });

  describe('Standard Endpoints', () => {
    it('search should call findNearby', async () => {
      mockService.findNearby.mockResolvedValue([]);
      expect(await controller.search({ radius: 5 } as any)).toEqual([]);
      expect(service.findNearby).toHaveBeenCalled();
    });

    it('createReservation should call service', async () => {
      const dto = { parkingAvenueId: '1' } as any;
      mockService.createReservation.mockResolvedValue({ id: 'res-1' });
      expect(await controller.createReservation(dto, mockReq)).toEqual({ id: 'res-1' });
    });

    it('getReservations should call service', async () => {
      mockService.getReservations.mockResolvedValue({ data: [] });
      expect(await controller.getReservations('ave-1', {} as any, mockReq)).toEqual({ data: [] });
    });

    it('verify should call verifyPayment', async () => {
      mockService.verifyPayment.mockResolvedValue({ message: 'ok' });
      expect(await controller.verify('REF')).toEqual({ message: 'ok' });
    });

    it('remove should call service.remove', async () => {
      await controller.remove('ave-1', mockReq);
      expect(service.remove).toHaveBeenCalledWith('ave-1', 'owner-123');
    });
  });
});