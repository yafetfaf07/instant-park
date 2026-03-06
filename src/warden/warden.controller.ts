import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, HttpCode, Query } from '@nestjs/common';
import { WardenService } from './warden.service';
import { CreateWardenDto } from './dto/create-warden.dto';
import { UpdateWardenDto } from './dto/update-warden.dto';
import type { RequestWithUser } from '../auth/express-request-with-user.interface';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { UpdateParkingAvenueOwnerDto } from 'src/parking-avenue-owner/dto/update-parking-avenue-owner.dto';
import { LoginDto } from 'src/auth/dto/login.dto';
import { LoginVerifyDto } from 'src/auth/dto/loginVerify.dto';
import { GetMyParkingAvenueDetailDto } from 'src/parking-avenue/dto/get-my-parking-avenue-detail.dto';
import { GetUsernameWardenDto } from './dto/get-username-warden.dto';
import { GetPhoneNoWardenDto } from './dto/get-phoneno-warden.dto';


@Controller('warden')
export class WardenController {
  constructor(private readonly wardenService: WardenService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Register a new Warden' })
  @ApiBody({ type: CreateWardenDto })
  @ApiBearerAuth('JWT-auth')
  create(@Body() createWardenDto: CreateWardenDto, @Req() req: RequestWithUser) {
    return this.wardenService.create(createWardenDto, req.user.id);
  }

  @Post('sendlogin')
  @ApiOperation({ summary: 'Send Otp to warden who is trying to login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT token',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  loginSendOtp(@Body() dto: LoginDto) {
    return this.wardenService.loginSendOtp(dto);
  }

  @Post('verifylogin')
  @ApiOperation({ summary: 'Verify otp sent to warden so they can login' })
  @ApiBody({ type: LoginVerifyDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT token',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  loginVerifyOtp(@Body() dto: LoginVerifyDto){
    return this.wardenService.loginVerifyOtp(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get list of wardens of a given parking avenue' })
  @ApiBearerAuth('JWT-auth')
  findAll(@Query() getMyParkingAvenueDetailDto: GetMyParkingAvenueDetailDto, @Req() req: RequestWithUser) {
    return this.wardenService.findAll(getMyParkingAvenueDetailDto.id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current warden profile' })
  @ApiBearerAuth('JWT-auth')
  me(@Req() req: RequestWithUser) {
    return this.wardenService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get warden by user name' })
  @Get('username')
  @ApiBearerAuth('JWT-auth')
  getWardenByUserName(@Query() getUsernameWardenDto: GetUsernameWardenDto, @Req() req: RequestWithUser){
    return this.wardenService.getWardenByUserName(getUsernameWardenDto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get warden by phone number' })
  @Get('phoneno')
  @ApiBearerAuth('JWT-auth')
  getWardenByPhone(@Query() getPhoneNoWardenDto: GetPhoneNoWardenDto, @Req() req: RequestWithUser){
    return this.wardenService.getWardenByPhoneNo(getPhoneNoWardenDto, req.user.id);
  }


  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get warden detail' })
  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  getWardenDetail(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.wardenService.getWardenDetail(id, req.user.id);
  }



  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: UpdateWardenDto })
  @ApiOperation({ summary: 'update warden profile' })
  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWardenDto: UpdateWardenDto, @Req() req: RequestWithUser,) {
    return this.wardenService.update(id, updateWardenDto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(204) 
  @ApiOperation({ summary: 'Delete a warden account using their id' })
  @ApiBearerAuth('JWT-auth')
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.wardenService.remove(id, req.user.id);
  }



}
