import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, UseInterceptors, UploadedFile, BadRequestException, Sse, Query } from '@nestjs/common';
import { ParkingAvenueOwnerService } from './parking-avenue-owner.service';
import { CreateParkingAvenueOwnerDto } from './dto/create-parking-avenue-owner.dto';
import { UpdateParkingAvenueOwnerDto } from './dto/update-parking-avenue-owner.dto';
import { LoginParkingAvenueOwnerDto } from './dto/login-parking-avenue-owner.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import type { RequestWithUser } from 'src/auth/express-request-with-user.interface';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { Observable } from 'rxjs';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { GetDashboardOverviewDto } from './dto/get-dashboard-overview.dto';
import { GetTodayOccupancyChartDto } from './dto/get-today-occupancy-chart.dto';
import { ResendCredentialsDto } from './dto/resend-credentials-dto';

const diskStorageConfig = diskStorage({
  destination: 'uploads',
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

@Controller('parking-avenue-owner')
export class ParkingAvenueOwnerController {
  constructor(private readonly parkingAvenueOwnerService: ParkingAvenueOwnerService) {}
    
    private cleanupFiles(personalId: string) {
      
        if (personalId && fs.existsSync(personalId)) {
          fs.unlinkSync(personalId);
        }
    }
    
    @Post('register')
    @UseInterceptors(FileInterceptor('personalId', { storage: diskStorageConfig }))
    @ApiOperation({ summary: 'Register a new parking avenue owner' })
    @ApiBody({ type: CreateParkingAvenueOwnerDto })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({ status: 201, description: 'Parking avenue owner registered successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 409, description: 'Conflict, parking avenue owner already exists' })
    register(
      @Body() createParkingAvenueOwnerDto: CreateParkingAvenueOwnerDto,
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

      createParkingAvenueOwnerDto.personalId = personalId.path;
      
      try{
        return this.parkingAvenueOwnerService.register(createParkingAvenueOwnerDto);

      } catch(error){
        this.cleanupFiles(personalId.path);
        throw error;
      }
    }
  
    @Post('login')
    @ApiOperation({ summary: 'Login parking avenue owner' })
    @ApiBody({ type: LoginParkingAvenueOwnerDto })
    @ApiResponse({
      status: 200,
      description: 'Login successful, returns JWT token',
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    login(@Body() updateParkingAvenueOwnerDto: UpdateParkingAvenueOwnerDto) {
      return this.parkingAvenueOwnerService.login(updateParkingAvenueOwnerDto);
    }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get parking avenue owner profile' })
  @ApiResponse({ status: 200, description: 'Parking avenue owner profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth('JWT-auth')
  me(@Req() req: RequestWithUser) {
    const id = req.user.id;
    return this.parkingAvenueOwnerService.getProfile(id);
  }

@Sse('live-activity')
  async streamLiveActivities(@Query('ownerId') ownerId: string): Promise<Observable<MessageEvent>> {
    return this.parkingAvenueOwnerService.getLiveActivityStream(ownerId);
  }

  @Get('dashboard/overview')
  async getDashboardOverview(@Query('ownerId') ownerId: string): Promise<GetDashboardOverviewDto> {
    return this.parkingAvenueOwnerService.getDashboardOverview(ownerId);
  }

  @Get('dashboard/today-occupancy-chart')
  async getTodayOccupancyChartData(@Query('ownerId') ownerId: string): Promise<GetTodayOccupancyChartDto> {
    return this.parkingAvenueOwnerService.getTodayOccupancyChartData(ownerId);
  }

  @Post('forgot-password')
  @ApiBody({ type: ForgotPasswordDto })
  forgotPassword(@Body() forgotPasswordDto : ForgotPasswordDto){
    return this.parkingAvenueOwnerService.forgotPassword(forgotPasswordDto.email)
  }

  @Post('reset-password')
  @ApiBody({ type: ResetPasswordDto })
    resetPassword(@Body() resetPasswordDto: ResetPasswordDto){
    return this.parkingAvenueOwnerService.resetPassword(resetPasswordDto.email, resetPasswordDto.token, resetPasswordDto.newPassword)
  }

  @UseGuards(JwtAuthGuard)
  @Get('wardens')
  @ApiOperation({ summary: 'Get list of all wardens for all my parking avenues' })
  @ApiQuery({ name: 'cursor', required: false, type: String }) 
  @ApiBearerAuth('JWT-auth')
  async getMyWardens(@Req() req: RequestWithUser, @Query('cursor') cursor?: string,) {
    return this.parkingAvenueOwnerService.getWardensForOwner(req.user.id);
  }

    @Post('resend-credentials')
    @ApiBody({ type: ResendCredentialsDto })
    @ApiOperation({ summary: 'Resend login credentials for new accounts' })
    async resendCredentials(@Body('email') email: string) {
      return this.parkingAvenueOwnerService.resendCredentials(email);
    }
  


  }
