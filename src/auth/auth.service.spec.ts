import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { DatabaseService } from '../database/database.service';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { of } from 'rxjs';

describe('AuthService', () => {
  let service: AuthService;
  let db: any;
  let httpService: any;
  let jwtService: any;
  let configService: any;

  const mockDb = {
    customer: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    temp: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockHttpService = { get: jest.fn() };
  const mockJwtService = { sign: jest.fn() };
  const mockConfigService = { get: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: HttpService, useValue: mockHttpService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    db = module.get(DatabaseService);
    httpService = module.get(HttpService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendOtp', () => {
    it('should successfully call AfroMessage API and return data', async () => {
      configService.get.mockReturnValue('fake-token');
      const apiResponse = { data: { acknowledge: 'success', response: { verificationId: '123' } } };
      httpService.get.mockReturnValue(of(apiResponse)); // Mocking Axios Observable

      const result = await service.sendOtp('0912345678');
      expect(result).toEqual(apiResponse.data);
      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.afromessage.com/api/challenge',
        expect.any(Object),
      );
    });
  });

  describe('verifyOtp (Registration Verify)', () => {
    it('should return "Invalid or expired OTP" if temp user is not found', async () => {
      db.temp.findUnique.mockResolvedValue(null);
      const result = await service.verifyOtp({ otp: '1234' });
      expect(result).toBe('Invalid or expired OTP');
    });

    it('should create customer, delete temp, and return token on successful verification', async () => {
      const tempUser = { phoneNo: '0912345678', firstName: 'John' };
      db.temp.findUnique.mockResolvedValue(tempUser);

      httpService.get.mockReturnValue(of({ data: { acknowledge: 'success' } }));
      
      db.customer.create.mockResolvedValue({ id: 'user-1' });
      db.temp.delete.mockResolvedValue(true);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.verifyOtp({ otp: '1234' });
      
      expect(db.customer.create).toHaveBeenCalled();
      expect(db.temp.delete).toHaveBeenCalledWith({ where: { code: '1234' } });
      expect(result).toEqual({ accessToken: 'jwt-token' });
    });
  });

  describe('register', () => {
    const dto = { phoneNo: '0912345678', username: 'john_doe', firstName: 'John' } as any;

    it('should throw ConflictException if phone number already exists', async () => {
      db.customer.findFirst.mockResolvedValue({ phoneNo: '0912345678', username: 'other' });
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if username already exists', async () => {
      db.customer.findFirst.mockResolvedValue({ phoneNo: 'other', username: 'john_doe' });
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should create temp user and return success message if OTP sent', async () => {
      db.customer.findFirst.mockResolvedValue(null);
      
      jest.spyOn(service, 'sendOtp').mockResolvedValue({
        acknowledge: 'success',
        response: { verificationId: 'v-123', code: '1234' },
      });

      db.temp.create.mockResolvedValue({ ...dto });

      const result = await service.register(dto);
      expect(db.temp.create).toHaveBeenCalled();
      expect(result.message).toBe('Temp account created verify your account with otp you recieved');
      expect(result.temp.phoneNo).toBe('0912345678');
    });
  });

  describe('loginSendOtp', () => {
    it('should throw BadRequestException if phone number is missing', async () => {
      await expect(service.loginSendOtp({} as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user is not found', async () => {
      db.customer.findUnique.mockResolvedValue(null);
      await expect(service.loginSendOtp({ phoneNo: '0912345678' } as any)).rejects.toThrow(NotFoundException);
    });

    it('should return success message when OTP is sent', async () => {
      db.customer.findUnique.mockResolvedValue({ id: 'user-1' });
      jest.spyOn(service, 'sendOtp').mockResolvedValue({ acknowledge: 'success' });

      const result = await service.loginSendOtp({ phoneNo: '0912345678' } as any);
      expect(result).toEqual({ response: 'OTP sent successfully' });
    });
  });

  describe('loginVerifyOtp', () => {
    const dto = { phoneNo: '0912345678', otp: '1234', location: 'loc' } as any;

    it('should throw BadRequestException if phone number is missing', async () => {
      await expect(service.loginVerifyOtp({ otp: '1234' } as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user is not found', async () => {
      db.customer.findUnique.mockResolvedValue(null);
      await expect(service.loginVerifyOtp(dto)).rejects.toThrow(NotFoundException);
    });

    it('should update user and return token on successful verification', async () => {
      db.customer.findUnique.mockResolvedValue({ id: 'user-1' });
      httpService.get.mockReturnValue(of({ data: { acknowledge: 'success' } }));
      db.customer.update.mockResolvedValue(true);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.loginVerifyOtp(dto);

      expect(db.customer.update).toHaveBeenCalled();
      expect(result).toEqual({ accessToken: 'jwt-token' });
    });

    it('should return error string if OTP verification fails', async () => {
      db.customer.findUnique.mockResolvedValue({ id: 'user-1' });
      httpService.get.mockReturnValue(of({ data: { acknowledge: 'error', errors: ['Invalid code'] } }));

      const result = await service.loginVerifyOtp(dto);
      expect(result).toBe('Invalid code');
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      db.customer.findUnique.mockResolvedValue({ firstName: 'John' });
      const result = await service.getProfile('user-1');
      expect(result).toEqual({ firstName: 'John' });
    });

    it('should throw NotFoundException if user not found', async () => {
      db.customer.findUnique.mockResolvedValue(null);
      await expect(service.getProfile('user-1')).rejects.toThrow(NotFoundException);
    });
  });
});