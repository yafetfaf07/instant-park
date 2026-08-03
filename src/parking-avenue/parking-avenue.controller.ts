import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, HttpCode, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ParkingAvenueService } from './parking-avenue.service';
import { CreateParkingAvenueDto } from './dto/create-parking-avenue.dto';
import { UpdateParkingAvenueDto } from './dto/update-parking-avenue.dto';
import type { RequestWithUser } from '../auth/express-request-with-user.interface';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { SearchParkingDto } from './dto/search-parking-avenue.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { GetReservationsDto } from './dto/get-reservations.dto';
import { GetCheckInsDto } from './dto/get-check-ins.dto';
import { GetMyParkingAvenueDetailDto } from './dto/get-my-parking-avenue-detail.dto';
import { GetNameParkingAvenueDto } from './dto/get-name-parking-avenue.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { CreateParkingAvenueImageDto } from './dto/create-parking-avenue-image.dto';
import { ParkingAvenueType } from '@prisma/client';
import { FilterParkingDto } from './dto/filter-parking.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UploadedFiles } from '@nestjs/common';


const diskStorageConfig = diskStorage({
  destination: 'uploads',
  filename: (req, file, callback) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = extname(file.originalname);
    callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

@Controller('parking-avenue')
export class ParkingAvenueController {
  constructor(private readonly parkingAvenueService: ParkingAvenueService) { }

  private cleanupFiles(legalDoc: string) {

    if (legalDoc && fs.existsSync(legalDoc)) {
      fs.unlinkSync(legalDoc);
    }
  }


  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'legalDoc', maxCount: 1 },
    { name: 'photosUrl', maxCount: 1 },
  ], { storage: diskStorageConfig }))
  @ApiOperation({ summary: 'Register a new parking avenue' })
  @ApiBody({ type: CreateParkingAvenueDto })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Parking avenue registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Conflict, parking avenue already exists' })
  @ApiBearerAuth('JWT-auth')
  create(
    @Body() createParkingAvenueDto: CreateParkingAvenueDto,
    @UploadedFiles() files: { legalDoc?: Express.Multer.File[], photosUrl?: Express.Multer.File[] },
    @Req() req: RequestWithUser
  ) {

    const legalDoc = files.legalDoc?.[0];
    const photosUrl = files.photosUrl?.[0];

    if (!legalDoc) {
      throw new BadRequestException('legalDoc is required');
    }



    if (legalDoc && legalDoc.size > 2 * 1024 * 1024) {
      this.cleanupFiles(legalDoc.path);
      throw new BadRequestException('Legal doc must be smaller than 2MB');
    }

    if (photosUrl && photosUrl.size > 2 * 1024 * 1024) {
      this.cleanupFiles(legalDoc.path);
      throw new BadRequestException('Image must be smaller than 2MB');
    }

    if (!legalDoc.mimetype.match(/image\/(jpg|jpeg|png)/)) {
      this.cleanupFiles(legalDoc.path);
      throw new BadRequestException(
        'Only image files (jpg, png, jpeg) are allowed',
      );
    }

    if (photosUrl) {

      if (!photosUrl.mimetype.match(/image\/(jpg|jpeg|png)/)) {
        this.cleanupFiles(legalDoc.path);
        throw new BadRequestException(
          'Only image files (jpg, png, jpeg) are allowed',
        );
      }
    }


    createParkingAvenueDto.legalDoc = legalDoc.path;

    try {
      if (photosUrl) {
        return this.parkingAvenueService.create(createParkingAvenueDto, req.user.id, photosUrl.path);
      }
      return this.parkingAvenueService.create(createParkingAvenueDto, req.user.id);
    }
    catch (error) {
      this.cleanupFiles(legalDoc.path);
      throw error;
    }

  }

  @UseGuards(JwtAuthGuard)
  @Get('list')
  @ApiOperation({ summary: 'Get all the parking avenue you own' })
  @ApiBearerAuth('JWT-auth')
  @ApiQuery({ name: 'cursor', required: false, type: String })
  getMyParkingAvenueList(@Req() req: RequestWithUser, @Query('cursor') cursor?: string) {
    return this.parkingAvenueService.getMyParkingAvenueList(req.user.id, cursor);
  }

  @UseGuards(JwtAuthGuard)
  @Get('detail')
  @ApiOperation({ summary: 'Get a detail of a single parking avenue you own' })
  @ApiBearerAuth('JWT-auth')
  getMyParkingAvenueDetail(@Query() getMyParkingAvenueDetailDto: GetMyParkingAvenueDetailDto, @Req() req: RequestWithUser) {
    return this.parkingAvenueService.getMyParkingAvenueDetail(req.user.id, getMyParkingAvenueDetailDto.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('getParkingAvenueImages')
  @ApiOperation({ summary: 'Get all images of single parking avenue you own' })
  @ApiBearerAuth('JWT-auth')
  getMyParkingAvenueImages(@Query() getMyParkingAvenueDetailDto: GetMyParkingAvenueDetailDto, @Req() req: RequestWithUser) {
    return this.parkingAvenueService.getMyParkingAvenueImages(getMyParkingAvenueDetailDto, req.user.id)
  }


  @Get('search')
  @ApiOperation({ summary: 'Find nearby parking avenues' })
  @ApiResponse({ status: 200, description: 'List of nearby parking avenues sorted by distance' })
  search(@Query() searchDto: SearchParkingDto) {
    return this.parkingAvenueService.findNearby(searchDto);
  }

  @ApiOperation({ summary: 'Get parking avenue detail' })
  @Get(':id')
  getParkingAvenueDetail(@Param('id') parkingAvenueId: string, @Query('eta') eta: number) {
    return this.parkingAvenueService.getParkingAvenueDetail(parkingAvenueId, eta);
  }

  @ApiOperation({ summary: 'Get parking avenue by name' })
  @Get('name')
  getParkingAvenueByName(@Query() getNameParkingAvenueDto: GetNameParkingAvenueDto) {
    return this.parkingAvenueService.getParkingAvenueByName(getNameParkingAvenueDto);
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

  @UseGuards(JwtAuthGuard)
  @Get('reservations/avenue/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get paginated reservations for a parking lot' })
  @ApiResponse({ status: 200, description: 'List of reservations with pagination meta' })
  async getReservationsByAvenue(
    @Param('id') id: string,
    @Query() query: GetReservationsDto,
    @Req() req: RequestWithUser
  ) {
    return this.parkingAvenueService.getReservationsByAvenue(id, query, req.user.id);
  }

  //@UseGuards(JwtAuthGuard)
  @Get('reservations/user/:id')
  //@ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get paginated reservations for a user' })
  @ApiResponse({ status: 200, description: 'List of reservations with pagination meta' })
  async getReservationsByUser(
    @Param('id') id: string,
    @Query() query: GetReservationsDto,
    @Req() req: RequestWithUser
  ) {
    return this.parkingAvenueService.getReservationsByUser(id, query);
  }
  @Get('reservation/verify')
  @ApiOperation({ summary: 'Verify if reservation payment has been made' })
  verify(@Query('bookingRef') ref: string) {
    return this.parkingAvenueService.verifyPayment(ref);
  }

  @Get('check-ins/:id')
  @ApiOperation({ summary: 'get list of checked in users from parking avenue' })
  async getAvenueCheckIns(@Param('id') parkingAvenueId: string, @Query() query: GetCheckInsDto,) {
    return this.parkingAvenueService.getAvenueCheckIns(parkingAvenueId, query);
  }


  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: UpdateParkingAvenueDto })
  @ApiOperation({ summary: 'update parking Avenue' })
  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateParkingAvenueDto: UpdateParkingAvenueDto,
    @Req() req: RequestWithUser
  ) {
      
      return this.parkingAvenueService.update(id, updateParkingAvenueDto, req.user.id);

  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a parking avenue using id' })
  @ApiBearerAuth('JWT-auth')
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.parkingAvenueService.remove(id, req.user.id);
  }


  @UseGuards(JwtAuthGuard)
  @Post('addimage')
  @UseInterceptors(FileInterceptor('photosUrl', { storage: diskStorageConfig }))
  @ApiOperation({ summary: 'Add image to parking avenue that can be shown to users' })
  @ApiBody({ type: CreateParkingAvenueImageDto })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth('JWT-auth')
  addImage(
    @Body() createParkingAvenueImageDto: CreateParkingAvenueImageDto,
    @UploadedFile() photosUrl: Express.Multer.File,
    @Req() req: RequestWithUser
  ) {
    if (!photosUrl) {
      throw new BadRequestException('legalDoc is required');
    }

    if (photosUrl && photosUrl.size > 2 * 1024 * 1024) {
      this.cleanupFiles(photosUrl.path);
      throw new BadRequestException('Image must be smaller than 2MB');
    }

    if (!photosUrl.mimetype.match(/image\/(jpg|jpeg|png)/)) {
      this.cleanupFiles(photosUrl.path);
      throw new BadRequestException(
        'Only image files (jpg, png, jpeg) are allowed',
      );
    }

    createParkingAvenueImageDto.photosUrl = photosUrl.path;

    try {
      return this.parkingAvenueService.addImage(createParkingAvenueImageDto, req.user.id)

    } catch (error) {
      this.cleanupFiles(photosUrl.path)
      throw error;
    }

  }

  @Get('list/optionalfiter')
  @ApiOperation({ summary: 'Get all parking avenues with optional filtering by type' })
  @ApiQuery({ name: 'type', enum: ParkingAvenueType, required: false })
  @ApiBearerAuth('JWT-auth')
  async findAll(@Query() filterDto: FilterParkingDto) {
    return this.parkingAvenueService.findAll(filterDto);
  }


}
