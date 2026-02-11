import { Controller, Get, Post, Body, UseGuards, Req, Patch, Sse } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import type { RequestWithUser } from 'src/auth/express-request-with-user.interface';
import { Observable, fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LiveActivityEvent } from './event/live-activity.event';


@Controller('admin')
// TODO: role base access required
// @UseGuards(JwtAuthGuard, AdminGuard) 
// @ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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
  @Get('unverified-parking-avenue-owners')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List of unverified parking avenue owners'})
  unverifiedParkingAvenueOwners(@Req() req: RequestWithUser){
    return this.adminService.unverifiedParkingAvenueOwners(req.user.id)
  }

  @UseGuards(JwtAuthGuard)
  @Patch('update-verification-status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update the verification status of a parking avenue owner'})
    updateVerificationStatus(@Body() verificationdto: {username: string, verificationUpdate: boolean}, @Req() req: RequestWithUser){
    return this.adminService.updateVerificationStatus(verificationdto,req.user.id)
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
}
