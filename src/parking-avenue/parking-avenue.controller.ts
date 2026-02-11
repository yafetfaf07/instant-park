import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { ParkingAvenueService } from './parking-avenue.service';
import { CreateParkingAvenueDto } from './dto/create-parking-avenue.dto';
import { UpdateParkingAvenueDto } from './dto/update-parking-avenue.dto';
import type { RequestWithUser } from '../auth/express-request-with-user.interface';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { SearchParkingDto } from './dto/search-parking-avenue.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { GetReservationsDto } from './dto/get-reservations.dto';
import { GetCheckInsDto } from './dto/get-check-ins.dto';
import { GetMyParkingAvenueDetailDto } from './dto/get-parking-avenue-detail.dto';

@Controller('parking-avenue')
export class ParkingAvenueController {
  constructor(private readonly parkingAvenueService: ParkingAvenueService) { }

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

  @UseGuards(JwtAuthGuard)
  @Get('list')
  @ApiOperation({ summary: 'Get all the parking avenue you own' })
  @ApiBearerAuth('JWT-auth')
  getMyParkingAvenueList( @Req() req: RequestWithUser){
    return this.parkingAvenueService.getMyParkingAvenueList(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('detail')
  @ApiOperation({ summary: 'Get a detail of a single parking avenue you own' })
  @ApiBearerAuth('JWT-auth')
  getMyParkingAvenueDetail(@Query() getMyParkingAvenueDetailDto: GetMyParkingAvenueDetailDto, @Req() req: RequestWithUser){
    return this.parkingAvenueService.getMyParkingAvenueDetail(req.user.id, getMyParkingAvenueDetailDto.id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Find nearby parking avenues' })
  @ApiResponse({ status: 200, description: 'List of nearby parking avenues sorted by distance' })
  search(@Query() searchDto: SearchParkingDto) {
    return this.parkingAvenueService.findNearby(searchDto);
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

  //@UseGuards(JwtAuthGuard)
  @Get('reservations/:id')
  //@ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get paginated reservations for a parking lot' })
  @ApiResponse({ status: 200, description: 'List of reservations with pagination meta' })
  async getReservations(
    @Param('id') id: string,
    @Query() query: GetReservationsDto,
    @Req() req: RequestWithUser
  ) {
    // TODO: we need to make sure only a warden assigned to the provided parking avenue can access this information

    return this.parkingAvenueService.getReservations(id, query);
  }

  @Get('reservation/verify')
  verify(@Query('bookingRef') ref: string) {
    return this.parkingAvenueService.verifyPayment(ref);
  }

  @Get('check-ins/:id')
  async getAvenueCheckIns(@Param('id') parkingAvenueId: string, @Query() query: GetCheckInsDto,) {
    return this.parkingAvenueService.getAvenueCheckIns(parkingAvenueId, query);
  }
}
