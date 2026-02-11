import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ParkingAvenueOwnerService } from './parking-avenue-owner.service';
import { CreateParkingAvenueOwnerDto } from './dto/create-parking-avenue-owner.dto';
import { UpdateParkingAvenueOwnerDto } from './dto/update-parking-avenue-owner.dto';
import { LoginParkingAvenueOwnerDto } from './dto/login-parking-avenue-owner.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import type { RequestWithUser } from 'src/auth/express-request-with-user.interface';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('parking-avenue-owner')
export class ParkingAvenueOwnerController {
  constructor(private readonly parkingAvenueOwnerService: ParkingAvenueOwnerService) {}

    
    @Post('register')
    @ApiOperation({ summary: 'Register a new parking avenue owner' })
    @ApiBody({ type: CreateParkingAvenueOwnerDto })
    @ApiResponse({ status: 201, description: 'Parking avenue owner registered successfully' })
    @ApiResponse({ status: 400, description: 'Bad request' })
    @ApiResponse({ status: 409, description: 'Conflict, parking avenue owner already exists' })
    register(@Body() createParkingAvenueOwnerDto: CreateParkingAvenueOwnerDto) {
      return this.parkingAvenueOwnerService.register(createParkingAvenueOwnerDto);
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


  }
