import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  // Mock Request Object mimicking Express RequestWithUser
  const mockRequest = {
    user: { id: 'user-123' },
  } as any;

  // Mocking all methods inside AuthService
  const mockAuthService = {
    register: jest.fn(),
    verifyOtp: jest.fn(),
    loginSendOtp: jest.fn(),
    loginVerifyOtp: jest.fn(),
    getProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call register method in service', async () => {
    const dto = { username: 'john', phoneNo: '0912345678' } as any;
    mockAuthService.register.mockResolvedValue({ message: 'Success' });

    const result = await controller.register(dto);
    
    expect(result).toEqual({ message: 'Success' });
    expect(service.register).toHaveBeenCalledWith(dto);
  });

  it('should call verifyOtp method in service', async () => {
    const dto = { otp: '1234' };
    mockAuthService.verifyOtp.mockResolvedValue({ accessToken: 'token' });

    const result = await controller.verifyOtp(dto);
    
    expect(result).toEqual({ accessToken: 'token' });
    expect(service.verifyOtp).toHaveBeenCalledWith(dto);
  });

  it('should call loginSendOtp method in service', async () => {
    const dto = { phoneNo: '0912345678' } as any;
    mockAuthService.loginSendOtp.mockResolvedValue({ response: 'OTP sent successfully' });

    const result = await controller.loginSendOtp(dto);
    
    expect(result).toEqual({ response: 'OTP sent successfully' });
    expect(service.loginSendOtp).toHaveBeenCalledWith(dto);
  });

  it('should call loginVerifyOtp method in service', async () => {
    const dto = { phoneNo: '0912345678', otp: '1234' } as any;
    mockAuthService.loginVerifyOtp.mockResolvedValue({ accessToken: 'token' });

    const result = await controller.loginVerifyOtp(dto);
    
    expect(result).toEqual({ accessToken: 'token' });
    expect(service.loginVerifyOtp).toHaveBeenCalledWith(dto);
  });

  it('should call me (getProfile) method in service using req.user.id', async () => {
    const mockProfile = { firstName: 'John', phoneNo: '0912345678' };
    mockAuthService.getProfile.mockResolvedValue(mockProfile);

    const result = await controller.me(mockRequest);
    
    expect(result).toEqual(mockProfile);
    expect(service.getProfile).toHaveBeenCalledWith('user-123'); // Extracted from mockRequest
  });
});