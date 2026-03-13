import { Test, TestingModule } from '@nestjs/testing';
import { WardenService } from './warden.service';
import { DatabaseService } from '../database/database.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('WardenService', () => {
  let service: WardenService;
  let dbService: DatabaseService;
  let jwtService: JwtService;
  let httpService: HttpService;

  // 1. Setup Mock Dependencies
  const mockDatabaseService = {
    parkingAvenueOwner: {
      findUnique: jest.fn(),
    },
    warden: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    parkingAvenue: {
      findMany: jest.fn(),
    },
  };

  const mockJwtService = { sign: jest.fn() };
  const mockConfigService = { get: jest.fn().mockReturnValue('mock-token') };
  const mockHttpService = { get: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WardenService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<WardenService>(WardenService);
    dbService = module.get<DatabaseService>(DatabaseService);
    jwtService = module.get<JwtService>(JwtService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear mocks between tests
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto = { phoneNo: '1234567890', username: 'testuser' } as any;
    const ownerId = 'owner-1';

    it('should throw NotFoundException if owner does not exist', async () => {
      mockDatabaseService.parkingAvenueOwner.findUnique.mockResolvedValue(null);
      await expect(service.create(dto, ownerId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if owner is not verified', async () => {
      mockDatabaseService.parkingAvenueOwner.findUnique.mockResolvedValue({ isVerified: false });
      await expect(service.create(dto, ownerId)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if phone number already exists', async () => {
      mockDatabaseService.parkingAvenueOwner.findUnique.mockResolvedValue({ isVerified: true });
      mockDatabaseService.warden.findFirst.mockResolvedValue({ phoneNo: dto.phoneNo });
      await expect(service.create(dto, ownerId)).rejects.toThrow(ConflictException);
    });

    it('should create warden and return access token', async () => {
      mockDatabaseService.parkingAvenueOwner.findUnique.mockResolvedValue({ isVerified: true });
      mockDatabaseService.warden.findFirst.mockResolvedValue(null); // No conflicts
      mockDatabaseService.warden.create.mockResolvedValue({ id: 'warden-1' });
      mockJwtService.sign.mockReturnValue('mocked-token');

      const result = await service.create(dto, ownerId);
      expect(result).toEqual({ accessToken: 'mocked-token' });
    });
  });

  describe('sendOtp', () => {
    it('should successfully send OTP', async () => {
      mockHttpService.get.mockReturnValue(of({ data: { acknowledge: 'success' } }));
      const result = await service.sendOtp('1234567890');
      expect(result).toEqual({ acknowledge: 'success' });
    });
  });

  describe('loginVerifyOtp', () => {
    const dto = { phoneNo: '1234567890', otp: '1234', location: 'loc' };

    it('should throw NotFoundException if phone does not match any warden', async () => {
      mockDatabaseService.warden.findUnique.mockResolvedValue(null);
      await expect(service.loginVerifyOtp(dto)).rejects.toThrow(NotFoundException);
    });

    it('should verify OTP and return access token on success', async () => {
      mockDatabaseService.warden.findUnique.mockResolvedValue({ id: 'warden-1' });
      mockHttpService.get.mockReturnValue(of({ data: { acknowledge: 'success' } }));
      mockDatabaseService.warden.update.mockResolvedValue({});
      mockJwtService.sign.mockReturnValue('mocked-token');

      const result = await service.loginVerifyOtp(dto);
      expect(result).toEqual({ accessToken: 'mocked-token' });
      expect(mockDatabaseService.warden.update).toHaveBeenCalled();
    });
  });

  describe('loginSendOtp', () => {
    const dto = { phoneNo: '1234567890' };

    it('should throw NotFoundException if warden not found', async () => {
      mockDatabaseService.warden.findUnique.mockResolvedValue(null);
      await expect(service.loginSendOtp(dto)).rejects.toThrow(NotFoundException);
    });

    it('should send OTP and return success message', async () => {
      mockDatabaseService.warden.findUnique.mockResolvedValue({ id: 'warden-1' });
      // We mock the internal sendOtp method logic by mocking httpService
      mockHttpService.get.mockReturnValue(of({ data: { acknowledge: 'success' } }));

      const result = await service.loginSendOtp(dto);
      expect(result).toEqual({ response: 'OTP sent successfully' });
    });
  });

  describe('findAll', () => {
    it('should throw NotFoundException if owner is missing', async () => {
      mockDatabaseService.parkingAvenueOwner.findUnique.mockResolvedValue(null);
      await expect(service.findAll('av-1', 'owner-1')).rejects.toThrow(NotFoundException);
    });

    it('should return list of wardens', async () => {
      mockDatabaseService.parkingAvenueOwner.findUnique.mockResolvedValue({});
      mockDatabaseService.parkingAvenue.findMany.mockResolvedValue([{}]);
      mockDatabaseService.warden.findMany.mockResolvedValue([{ id: 'warden-1' }]);

      const result = await service.findAll('av-1', 'owner-1');
      expect(result).toEqual([{ id: 'warden-1' }]);
    });
  });

  describe('CRUD operations checks (getDetail, update, remove)', () => {
    const ownerId = 'owner-1';
    const wardenId = 'warden-1';

    beforeEach(() => {
      mockDatabaseService.parkingAvenueOwner.findUnique.mockResolvedValue({});
    });

    it('getWardenDetail should return a warden', async () => {
      mockDatabaseService.warden.findUnique.mockResolvedValue({ id: wardenId });
      expect(await service.getWardenDetail(wardenId, ownerId)).toEqual({ id: wardenId });
    });

    it('update should call DB update', async () => {
      mockDatabaseService.warden.findUnique.mockResolvedValue({ id: wardenId });
      mockDatabaseService.warden.update.mockResolvedValue({ id: wardenId, updated: true });
      expect(await service.update(wardenId, {} as any, ownerId)).toEqual({ id: wardenId, updated: true });
    });

    it('remove should call DB delete', async () => {
      mockDatabaseService.warden.findUnique.mockResolvedValue({ id: wardenId });
      mockDatabaseService.warden.delete.mockResolvedValue({ id: wardenId });
      await service.remove(wardenId, ownerId);
      expect(mockDatabaseService.warden.delete).toHaveBeenCalledWith({ where: { id: wardenId } });
    });
  });
});