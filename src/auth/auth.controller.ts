import { Controller, Post, Patch , Body, UseGuards, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import type { RequestWithUser } from './express-request-with-user.interface';
import { VerifyDto } from './dto/verify.dto';
import { LoginVerifyDto } from './dto/loginVerify.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

interface User {
  id: number;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Temp user created for now if user verifies otp customer will be created.' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Conflict, user already exists' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify otp user recieved' })
  @ApiBody({ type: VerifyDto })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  verifyOtp(@Body() dto: {otp: string}) {
    return this.auth.verifyOtp(dto);
  }


  @Post('sendlogin')
  @ApiOperation({ summary: 'Send Otp to user who is trying to login' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT token',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  loginSendOtp(@Body() dto: LoginDto) {
    return this.auth.loginSendOtp(dto);
  }

  @Post('verifylogin')
  @ApiOperation({ summary: 'Verify otp to user so they can login' })
  @ApiBody({ type: LoginVerifyDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT token',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  loginVerifyOtp(@Body() dto: LoginVerifyDto) {
    return this.auth.loginVerifyOtp(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBearerAuth('JWT-auth')
  me(@Req() req: RequestWithUser) {
    const id = req.user.id;
    return this.auth.getProfile(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('update-customer') 
  @ApiOperation({ summary: 'Update user profile' })
  @ApiBody({ type: UpdateProfileDto })
  @ApiBearerAuth('JWT-auth')
  async updateProfile(@Req() req: RequestWithUser, @Body() dto: UpdateProfileDto) 
  {
    return this.auth.updateProfile(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('validate-token')
  @ApiOperation({ summary: 'Check if current JWT token is valid' })
  @ApiResponse({ status: 200, description: 'Token is valid' })
  @ApiResponse({ status: 401, description: 'Token is invalid or expired' })
  @ApiBearerAuth('JWT-auth')
  validateToken() {
    return { valid: true };
  }


}
