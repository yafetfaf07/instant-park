import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { firstValueFrom } from 'rxjs';

describe('AdminController', () => {
  let controller: AdminController;
  let service: AdminService;
  let eventEmitter: EventEmitter2;

  const mockAdminService = {
    register: jest.fn(),
    login: jest.fn(),
    parkingAvenueOwnerStatus: jest.fn(),
    updateVerificationStatus: jest.fn(),
    getDashboardStats: jest.fn(),
    getByApprovalStatus: jest.fn(),
    getGlobalOverview: jest.fn(),
    getParkingLotsStatus: jest.fn(),
    updateApprovalStatus: jest.fn(),
  };

  const mockRequest = { user: { id: 'admin-123' } } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
        EventEmitter2, // We provide the real EventEmitter to test RxJS Observable streams
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    service = module.get<AdminService>(AdminService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call register', async () => {
    const dto = { username: 'test', password: 'password' } as any;
    mockAdminService.register.mockResolvedValue({ message: 'Success' });

    const result = await controller.register(dto);
    expect(result).toEqual({ message: 'Success' });
    expect(service.register).toHaveBeenCalledWith(dto);
  });

  it('should call login', async () => {
    const dto = { username: 'test', password: 'password' } as any;
    mockAdminService.login.mockResolvedValue({ accessToken: 'token' });

    const result = await controller.login(dto);
    expect(result).toEqual({ accessToken: 'token' });
    expect(service.login).toHaveBeenCalledWith(dto);
  });

  it('should call parkingAvenueOwnerStatus', async () => {
    const query = { approvalStatus: true } as any;
    mockAdminService.parkingAvenueOwnerStatus.mockResolvedValue([]);

    const result = await controller.parkingAvenueOwnerStatus(query, mockRequest);
    expect(result).toEqual([]);
    expect(service.parkingAvenueOwnerStatus).toHaveBeenCalledWith(query, 'admin-123');
  });

  it('should call updateVerificationStatus', async () => {
    const dto = { username: 'user', approvalStatus: true } as any;
    mockAdminService.updateVerificationStatus.mockResolvedValue({ id: '1' });

    const result = await controller.updateVerificationStatus(dto, mockRequest);
    expect(result).toEqual({ id: '1' });
    expect(service.updateVerificationStatus).toHaveBeenCalledWith(dto, 'admin-123');
  });

  it('should call getDashboard', async () => {
    mockAdminService.getDashboardStats.mockResolvedValue({ cards: {} });

    const result = await controller.getDashboard();
    expect(result).toEqual({ cards: {} });
    expect(service.getDashboardStats).toHaveBeenCalled();
  });

  it('should stream live events via SSE', async () => {
    // 1. Get the observable stream from the controller
    const stream$ = controller.streamEvents();
    
    // 2. Mock some dummy data that would be emitted
    const mockEventData = { type: 'NEW_RESERVATION', details: 'User reserved a spot' };
    
    // 3. Emit the event simulating system activity
    setTimeout(() => {
      eventEmitter.emit('live.activity', mockEventData);
    }, 50);

    // 4. Await the first value emitted by the stream
    const result = await firstValueFrom(stream$);

    // 5. Assert it formatted it as a MessageEvent successfully
    expect(result.data).toEqual(mockEventData);
  });

  it('should call getByApprovalStatus', async () => {
    const query = { approvalStatus: 'PENDING' } as any;
    mockAdminService.getByApprovalStatus.mockResolvedValue([]);

    const result = await controller.getByApprovalStatus(query, mockRequest);
    expect(result).toEqual([]);
    expect(service.getByApprovalStatus).toHaveBeenCalledWith(query, 'admin-123');
  });

  it('should call getGlobalOverview', async () => {
    mockAdminService.getGlobalOverview.mockResolvedValue({ totalProviders: 5 });

    const result = await controller.getGlobalOverview(mockRequest);
    expect(result).toEqual({ totalProviders: 5 });
    expect(service.getGlobalOverview).toHaveBeenCalledWith('admin-123');
  });

  it('should call getParkingLotsStatus', async () => {
    mockAdminService.getParkingLotsStatus.mockResolvedValue([]);

    const result = await controller.getParkingLotsStatus(mockRequest);
    expect(result).toEqual([]);
    expect(service.getParkingLotsStatus).toHaveBeenCalled(); // Note: Service doesn't take req.user.id
  });

  it('should call updateApprovalStatus', async () => {
    const dto = { id: 'ave1', approvalStatus: 'APPROVED' } as any;
    mockAdminService.updateApprovalStatus.mockResolvedValue({ id: 'ave1' });

    const result = await controller.updateApprovalStatus(dto, mockRequest);
    expect(result).toEqual({ id: 'ave1' });
    expect(service.updateApprovalStatus).toHaveBeenCalledWith(dto, 'admin-123');
  });
});
