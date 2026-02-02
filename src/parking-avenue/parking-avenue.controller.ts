import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { ParkingAvenueService } from './parking-avenue.service';
import { CreateParkingAvenueDto } from './dto/create-parking-avenue.dto';
import { UpdateParkingAvenueDto } from './dto/update-parking-avenue.dto';
import type { RequestWithUser } from '../auth/express-request-with-user.interface';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { SearchParkingDto } from './dto/search-parking-avenue.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';

@Controller('parking-avenue')
export class ParkingAvenueController {
  constructor(private readonly parkingAvenueService: ParkingAvenueService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Register a new parking avenue' })
  @ApiBody({ type: CreateParkingAvenueDto })
  @ApiResponse({ status: 201, description: 'Parking avenue registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Conflict, parking avenue already exists' })
  @ApiBearerAuth('JWT-auth')
  create(@Body() createParkingAvenueDto: CreateParkingAvenueDto, @Req() req: RequestWithUser) {
    return this.parkingAvenueService.create(createParkingAvenueDto, req.user.id);
  }

  @Get()
  findAll() {
    return this.parkingAvenueService.findAll();
  }

  @Get('search')
  @ApiOperation({ summary: 'Find nearby parking avenues' })
  @ApiResponse({ status: 200, description: 'List of nearby parking avenues sorted by distance' })
  search(@Body() searchDto: SearchParkingDto) {
    return this.parkingAvenueService.findNearby(searchDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.parkingAvenueService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('reserve')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Book a parking spot' })
  @ApiResponse({ status: 201, description: 'Reservation created successfully (Pending Payment)' })
  @ApiResponse({ status: 409, description: 'Conflict: Spot fully booked' })
  createReservation(@Body() createReservationDto: CreateReservationDto, @Req() req: RequestWithUser) {
    return this.parkingAvenueService.createReservation(createReservationDto, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateParkingAvenueDto: UpdateParkingAvenueDto) {
    return this.parkingAvenueService.update(+id, updateParkingAvenueDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.parkingAvenueService.remove(+id);
  }
}
