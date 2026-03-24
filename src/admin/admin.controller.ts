import { Controller, Get, Post, Body, UseGuards, Req, Patch, Sse, Query, BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiQuery  } from '@nestjs/swagger';
import type { RequestWithUser } from 'src/auth/express-request-with-user.interface';
import { Observable, fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LiveActivityEvent } from '../event/live-activity.event';
import { UpdateVerificationDto } from './dto/update-verification-dto';
import { GetByApprovalStatus } from './dto/get-by-approval-status.dto';
import { UpdateApprovalStatus } from './dto/update-approval-status.dto';

@Controller('admin')
// TODO: role base access required
// @UseGuards(JwtAuthGuard, AdminGuard) 
// @ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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
    return this.adminService.parkingAvenueOwnerStatus(getByApprovalStatus, req.user.id, cursor)
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
    return this.adminService.getByApprovalStatus(getByApprovalStatus, req.user.id);
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

}
