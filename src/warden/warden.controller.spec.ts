import { Test, TestingModule } from '@nestjs/testing';
import { WardenController } from './warden.controller';
import { WardenService } from './warden.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';


describe('WardenController', () => {
  let controller: WardenController;
  let service: WardenService;

  // 1. Setup Mock Service
  const mockWardenService = {
    create: jest.fn(),
    loginSendOtp: jest.fn(),
    loginVerifyOtp: jest.fn(),
    findAll: jest.fn(),
    getProfile: jest.fn(),
    getWardenByUserName: jest.fn(),
    getWardenByPhoneNo: jest.fn(),
    getWardenDetail: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  // 2. Setup mock request object (representing express req.user injected by JwtAuthGuard)
  const mockReq = {
    user: { id: 'user-id-123' },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WardenController],
      providers: [
        {
          provide: WardenService,
          useValue: mockWardenService, // Inject mock service here
        },
      ],
    })
    .overrideGuard(JwtAuthGuard) 
    .useValue({ canActivate: () => true }) 
    .compile();

    controller = module.get<WardenController>(WardenController);
    service = module.get<WardenService>(WardenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create() should call service.create', async () => {
    const dto = { phoneNo: '1234', username: 'test' } as any;
    mockWardenService.create.mockResolvedValue({ accessToken: 'token' });

    const result = await controller.create(dto, mockReq);

    expect(result).toEqual({ accessToken: 'token' });
    expect(service.create).toHaveBeenCalledWith(dto, 'user-id-123');
  });

  it('loginSendOtp() should call service.loginSendOtp', async () => {
    const dto = { phoneNo: '1234' };
    mockWardenService.loginSendOtp.mockResolvedValue({ response: 'Success' });

    expect(await controller.loginSendOtp(dto)).toEqual({ response: 'Success' });
    expect(service.loginSendOtp).toHaveBeenCalledWith(dto);
  });

  it('loginVerifyOtp() should call service.loginVerifyOtp', async () => {
    const dto = { phoneNo: '1234', otp: '0000', location: 'loc' };
    mockWardenService.loginVerifyOtp.mockResolvedValue({ accessToken: 'token' });

    expect(await controller.loginVerifyOtp(dto)).toEqual({ accessToken: 'token' });
  });

  it('findAll() should call service.findAll', async () => {
    const query = { id: 'avenue-1' } as any;
    mockWardenService.findAll.mockResolvedValue([]);

    expect(await controller.findAll(query, mockReq)).toEqual([]);
    expect(service.findAll).toHaveBeenCalledWith('avenue-1', 'user-id-123');
  });

  it('me() should call service.getProfile', async () => {
    mockWardenService.getProfile.mockResolvedValue({ id: 'user-id-123' });
    expect(await controller.me(mockReq)).toEqual({ id: 'user-id-123' });
    expect(service.getProfile).toHaveBeenCalledWith('user-id-123');
  });

  it('getWardenByUserName() should call service.getWardenByUserName', async () => {
    const query = { username: 'test' };
    await controller.getWardenByUserName(query, mockReq);
    expect(service.getWardenByUserName).toHaveBeenCalledWith(query, 'user-id-123');
  });

  it('getWardenByPhone() should call service.getWardenByPhoneNo', async () => {
    const query = { phoneNo: '1234' };
    await controller.getWardenByPhone(query, mockReq);
    expect(service.getWardenByPhoneNo).toHaveBeenCalledWith(query, 'user-id-123');
  });

  it('getWardenDetail() should call service.getWardenDetail', async () => {
    await controller.getWardenDetail('warden-1', mockReq);
    expect(service.getWardenDetail).toHaveBeenCalledWith('warden-1', 'user-id-123');
  });

  it('update() should call service.update', async () => {
    const dto = { username: 'updated' };
    await controller.update('warden-1', dto, mockReq);
    expect(service.update).toHaveBeenCalledWith('warden-1', dto, 'user-id-123');
  });

  it('remove() should call service.remove', async () => {
    await controller.remove('warden-1', mockReq);
    expect(service.remove).toHaveBeenCalledWith('warden-1', 'user-id-123');
  });
});