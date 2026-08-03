import { Controller, Get, Post, Body, UseGuards, Req, Patch, Sse, Query, BadRequestException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiQuery, ApiConsumes  } from '@nestjs/swagger';
import type { RequestWithUser } from 'src/auth/express-request-with-user.interface';
import { Observable, fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LiveActivityEvent } from '../event/live-activity.event';
import { UpdateVerificationDto } from './dto/update-verification-dto';
import { GetByApprovalStatus } from './dto/get-by-approval-status.dto';
import { UpdateApprovalStatus } from './dto/update-approval-status.dto';
import { CreateParkingAvenueOwnerDto } from 'src/parking-avenue-owner/dto/create-parking-avenue-owner.dto';
import { ParkingAvenueOwnerService } from 'src/parking-avenue-owner/parking-avenue-owner.service';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { extname } from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateParkingAvenueOwnerByAdminDto } from 'src/parking-avenue-owner/dto/create-parking-avenue-owner-by-admin.dto';
import { CreateParkingAvenueByAdminDto } from 'src/parking-avenue/dto/create-parking-avenue-by-admin.dto';
import { ParkingAvenueService } from 'src/parking-avenue/parking-avenue.service';
import { AdminKpiDto, DetailedAnalyticsDto, WeeklyUtilizationDto } from './dto/dashboard.dto';
import { AiInsightService } from 'src/ai-analytics/ai-insight.service';
import { WardenService } from 'src/warden/warden.service';


const diskStorageConfig = diskStorage({
  destination: 'uploads',
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

@Controller('admin')

export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly eventEmitter: EventEmitter2,
    private readonly parkingAvenueService: ParkingAvenueService,
    private readonly parkingAvenueOwnerService: ParkingAvenueOwnerService,
    private readonly aiInsightService: AiInsightService,
    private readonly wardenService: WardenService
  ) {}

  private cleanupFiles(personalId: string) {
        
      if (personalId && fs.existsSync(personalId)) {
        fs.unlinkSync(personalId);
      }
  }

  private parseCursor(cursor?: string): string | undefined {
     if (!cursor) return undefined;
  
      if (cursor.length === 0) {
        throw new BadRequestException('cursor must be a valid string');
      }
      return cursor;
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new admin' })
  @ApiBody({ type: CreateAdminDto })
  @ApiResponse({ status: 201, description: 'Admin registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Conflict, admin already exists' })
  register(@Body() dto: CreateAdminDto) {
    return this.adminService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({ type: UpdateAdminDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT token',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  login(@Body() updateAdminDto: UpdateAdminDto) {
    return this.adminService.login(updateAdminDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('ownerverificationstatus')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get parking avenue owners by approval status'})
  @ApiQuery({ name: 'cursor', required: false, type: String }) 
  parkingAvenueOwnerStatus(@Query() getByApprovalStatus: GetByApprovalStatus, @Req() req: RequestWithUser, @Query('cursor') cursor?: string){
    return this.adminService.parkingAvenueOwnerStatus(getByApprovalStatus, req.user.id, this.parseCursor(cursor))
  }

  @UseGuards(JwtAuthGuard)
  @Patch('update-verification-status')
  @ApiBody({ type: UpdateVerificationDto})
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update the verification status of a parking avenue owner'})
    updateVerificationStatus(@Body() updateVerificationdto: UpdateVerificationDto, @Req() req: RequestWithUser){
    return this.adminService.updateVerificationStatus(updateVerificationdto, req.user.id)
  }


  @Get('dashboard')
  @ApiOperation({ summary: 'Get main dashboard stats' })
  getDashboard() {
    return this.adminService.getDashboardStats();
  }
  
  // NOTE: SSE endpoints usually require the token in the Query Param
  @Sse('live-activity')
  @ApiOperation({ summary: 'Real-time stream of system events' })
  streamEvents(): Observable<MessageEvent> {
    return fromEvent(this.eventEmitter, 'live.activity').pipe(
      
      map((data: LiveActivityEvent) => {
        return { 
          data: data 
        } as MessageEvent;
      }),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get parking avenue by approval status' })
  @Get('approvalstatus')
  @ApiBearerAuth('JWT-auth')
  @ApiQuery({ name: 'cursor', required: false, type: String }) 
  getByApprovalStatus(@Query() getByApprovalStatus: GetByApprovalStatus, @Req() req: RequestWithUser, @Query('cursor') cursor?: string){
    return this.adminService.getByApprovalStatus(getByApprovalStatus, req.user.id, this.parseCursor(cursor));
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({summary: 'Get summary of providers and locations'})
  @Get('getoverview')
  @ApiBearerAuth('JWT-auth')
  getGlobalOverview(@Req() req: RequestWithUser){
    return this.adminService.getGlobalOverview(req.user.id);
  }

  @Get('get-parking-lots-status')
  @ApiOperation({summary: 'Get status of parking avenues and their locations to be mapped'})
  getParkingLotsStatus(@Req() req: RequestWithUser){
    return this.adminService.getParkingLotsStatus()
  }


  @UseGuards(JwtAuthGuard)
  @Patch('update-approval-status')
  @ApiOperation({ summary: 'update the approval status of a parking avenue' })
  @ApiBody({ type: UpdateApprovalStatus})
  @ApiBearerAuth('JWT-auth')
  updateApprovalStatus(@Body() updateApprovalStatus: UpdateApprovalStatus, @Req() req: RequestWithUser){
    return this.adminService.updateApprovalStatus(updateApprovalStatus, req.user.id)
  }

  
  @UseGuards(JwtAuthGuard)
  @Get('avenueapprovalstatus')
  @ApiOperation({ summary: 'Get parking avenues without approval status filter' })
  @ApiBearerAuth('JWT-auth')
  @ApiQuery({ name: 'cursor', required: false, type: String }) 
  getWithoutApprovalStatus(@Req() req: RequestWithUser, @Query('cursor') cursor?: string){
    return this.adminService.getWithoutApprovalStatus(req.user.id, this.parseCursor(cursor),);
  }

  @UseGuards(JwtAuthGuard)
  @Get('ownerapprovalStatus')
  @ApiBearerAuth('JWT-auth')
  @ApiQuery({ name: 'cursor', required: false, type: String }) 
  @ApiOperation({ summary: 'Get parking avenue owners without approval status filter'})
  parkingAvenueOwnerWithoutApprovalStatus(@Req() req: RequestWithUser, @Query('cursor') cursor?: string){
    return this.adminService.parkingAvenueOwnerWithoutApprovalStatus(req.user.id, this.parseCursor(cursor))
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('personalId', { storage: diskStorageConfig }))
  @Post('/register/parking-avenue-owner')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Admin creates parking avenue owner account'})
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ type: CreateParkingAvenueOwnerByAdminDto })
  async createOwner(
    @Body() dto: CreateParkingAvenueOwnerByAdminDto, 
    @Req() req: RequestWithUser,
    @UploadedFile() personalId: Express.Multer.File,
  ) {
    if (!personalId) {
        throw new BadRequestException('personalId is required');
      }

      if (personalId && personalId.size > 2 * 1024 * 1024) {
        this.cleanupFiles(personalId.path);
        throw new BadRequestException('Image must be smaller than 2MB');
      }

      if (!personalId.mimetype.match(/image\/(jpg|jpeg|png)/)) {
        this.cleanupFiles(personalId.path);
        throw new BadRequestException(
          'Only image files (jpg, png, jpeg) are allowed',
        );
      }
      dto.personalId = personalId.path;

      try{
          return this.parkingAvenueOwnerService.createOwnerByAdmin(dto, req.user.id);
      } catch(error){
        this.cleanupFiles(personalId.path);
        throw error;
      }
  }

  @UseGuards(JwtAuthGuard)
  @Post('/register/parking-avenue')
  @UseInterceptors(FileInterceptor('legalDoc', { storage: diskStorageConfig }))
  @ApiOperation({ summary: 'Admin creates parking avenue for parking avenue owner'})
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ type: CreateParkingAvenueByAdminDto })
  @ApiConsumes('multipart/form-data')
  async createParkingAvenueByAdmin(
    @Body() dto: CreateParkingAvenueByAdminDto, 
    @UploadedFile() legalDoc: Express.Multer.File, 
    @Req() req: RequestWithUser
  ) {

    if (!legalDoc) {
        throw new BadRequestException('legalDoc is required');
    }
    
    if (legalDoc && legalDoc.size > 2 * 1024 * 1024) {
        this.cleanupFiles(legalDoc.path);
        throw new BadRequestException('Image must be smaller than 2MB');
      }

    if (!legalDoc.mimetype.match(/image\/(jpg|jpeg|png)/)) {
      this.cleanupFiles(legalDoc.path);
      throw new BadRequestException(
        'Only image files (jpg, png, jpeg) are allowed',
      );
    }

    dto.legalDoc = legalDoc.path;

    try{
        return this.parkingAvenueService.createParkingAvenueByAdmin(dto, req.user.id);
      } 
    catch(error){
      this.cleanupFiles(legalDoc.path);
      throw error;
    }
  }

  @Get('kpis')
  async getKpis(): Promise<AdminKpiDto> {
    return this.adminService.getDashboardKpis();
  }

  @Get('weekly-utilization')
  async getWeeklyUtilization(): Promise<WeeklyUtilizationDto[]> {
    return this.adminService.getWeeklyUtilizationTrend();
  }

  @Get('ai-insight')
  async getSystemAiInsight() {
    return this.aiInsightService.generateAdminInsight();
  }

  @UseGuards(JwtAuthGuard)
  @Get('list-wardens')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'get stats for wardens by admin'})
  @ApiQuery({ name: 'cursor', required: false, type: String }) 
  getWardenList(@Req() req: RequestWithUser, @Query('cursor') cursor?: string){
    return this.wardenService.getWardenStats(req.user.id, this.parseCursor(cursor))
  }

  @Get('detailed-analytics')
  async getDetailedAnalytics(): Promise<DetailedAnalyticsDto> {
    return this.adminService.getDetailedAnalytics();
  }

  @UseGuards(JwtAuthGuard)
  @Get('reservation-dashboard')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'get reservation dashboard'})
  getReservationDashboard(@Req() req: RequestWithUser){
    return this.adminService.getReservationDashboard(req.user.id)
  }


  @UseGuards(JwtAuthGuard)
  @Get('reservation-peak-demand')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'get reservation peak demand graph for admin'})
  getPeakDemandData(@Req() req: RequestWithUser){
    return this.adminService.getPeakDemandData(req.user.id)
  }
}
