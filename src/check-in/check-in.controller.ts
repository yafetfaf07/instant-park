import { Controller, Post, Body, Get, Query, Delete } from '@nestjs/common';
import { CheckInService } from './check-in.service';
import { CreateCheckInDto } from './dto/create-check-in.dto';

@Controller('check-in')
export class CheckInController {
    constructor(private readonly checkInService: CheckInService) { }

    @Post()
    async checkIn(@Body() dto: CreateCheckInDto) {
        return this.checkInService.create(dto);
    }

    @Get('details')
    async getDetails(@Query('licensePlate') licensePlate: string) {
        return this.checkInService.getCheckInDetails(licensePlate);
    }
    
    @Delete('exit')
    async checkOut(@Query('licensePlate') licensePlate: string) {
        return this.checkInService.checkOut(licensePlate);
    }
}
