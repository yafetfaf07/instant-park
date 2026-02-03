import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, HttpCode } from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import type { RequestWithUser } from 'src/auth/express-request-with-user.interface';

@Controller('vehicle')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBody({ type: CreateVehicleDto })
  @ApiOperation({ summary: 'Add a new car' })
  create(@Body() createVehicleDto: CreateVehicleDto, @Req() req: RequestWithUser) {
    return this.vehicleService.create(createVehicleDto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get list of the cars you have registered' })
  findAll(@Req() req: RequestWithUser) {
    return this.vehicleService.findAll(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':license')
  @ApiOperation({ summary: 'Find car using license plate' })
  findOne(@Param('license') license: string, @Req() req: RequestWithUser) {
    return this.vehicleService.findOne(license, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':license')
  @HttpCode(204) 
  @ApiOperation({ summary: 'Delete a car your collection' })
  remove(@Param('license') license: string, @Req() req: RequestWithUser) {
    return this.vehicleService.remove(license, req.user.id);
  }
}
