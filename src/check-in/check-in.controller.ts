import { Controller, Post, Body, Get, Query, Delete } from '@nestjs/common';
import { CheckInService } from './check-in.service';
import { CreateCheckInDto } from './dto/create-check-in.dto';
import { ApiBody, ApiOperation, ApiQuery } from '@nestjs/swagger';

@Controller('check-in')
export class CheckInController {
    constructor(private readonly checkInService: CheckInService) { }

    @Post()
    @ApiOperation({ summary: 'Check in' })
    @ApiBody({ type: CreateCheckInDto })
    async checkIn(@Body() dto: CreateCheckInDto) {
        return this.checkInService.create(dto);
    }

    @Get('details')
    @ApiOperation({ summary: 'Get Check in details for a customer' })
    @ApiQuery({ name: 'license plate', required: true, type: String })
    async getDetails(@Query('licensePlate') licensePlate: string) {
        return this.checkInService.getCheckInDetails(licensePlate);
    }
    
    @Delete('exit')
    @ApiOperation({ summary: 'Check out' })
    @ApiQuery({ name: 'license plate', required: true, type: String })
    async checkOut(@Query('licensePlate') licensePlate: string) {
        return this.checkInService.checkOut(licensePlate);
    }
}
