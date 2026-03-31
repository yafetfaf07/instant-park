import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, BadRequestException, Query } from '@nestjs/common';
import { IncidentReportService } from './incident-report.service';
import { CreateIncidentReportDto } from './dto/create-incident-report.dto';
import { UpdateIncidentReportDto } from './dto/update-incident-report.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { RequestWithUser } from 'src/auth/express-request-with-user.interface';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiQuery, ApiConsumes  } from '@nestjs/swagger';

@Controller('incident-report')
export class IncidentReportController {
  constructor(private readonly incidentReportService: IncidentReportService) {}

    private parseCursor(cursor?: string): string | undefined {
      if (!cursor) return undefined;

      if (cursor.length === 0) {
        throw new BadRequestException('cursor must be a valid string');
      }
      return cursor;
    }
 
    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiOperation({summary: 'Allow warden or customer to make an incident report'})
    @ApiBearerAuth('JWT-auth')
    async reportIncident(
      @Req() req: RequestWithUser, 
      @Body() dto: CreateIncidentReportDto
    )
    {
        return this.incidentReportService.create(dto, req.user.id);
    }

    @Get('owner/:parkingAvenueId')
    @UseGuards(JwtAuthGuard) 
    @ApiOperation({ summary: 'Get latest incident reports for a specific parking avenue (Owner only)' })
    @ApiBearerAuth('JWT-auth')
    @ApiQuery({ name: 'cursor', required: false, type: String }) 
    async getOwnerReports(
      @Req() req: RequestWithUser,
      @Param('parkingAvenueId') parkingAvenueId: string,
      @Query('cursor') cursor?: string
    ) {
      return this.incidentReportService.getReportsByOwner(req.user.id, parkingAvenueId, this.parseCursor(cursor));
    }

    @Get('warden-view')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Warden can see reports for their assigned parking avenue' })
    @ApiBearerAuth('JWT-auth')
    @ApiQuery({ name: 'cursor', required: false, type: String }) 
    async getWardenReports(@Req() req: RequestWithUser, @Query('cursor') cursor?: string) {
      return this.incidentReportService.getReportsForWarden(req.user.id, this.parseCursor(cursor));
    }

}
