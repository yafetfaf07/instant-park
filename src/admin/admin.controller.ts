import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';


@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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


  
}
