import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateIncidentReportDto } from './dto/create-incident-report.dto';
import { UpdateIncidentReportDto } from './dto/update-incident-report.dto';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class IncidentReportService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateIncidentReportDto, reporterId: string,) {
    

     const isCustomer = await this.db.customer.findUnique({
        where: {
          id: reporterId
        },
        select: {
          id: true
        }

      });

      const isWarden = await this.db.warden.findUnique({
          where: {
            id: reporterId
          },
          select: {
            id: true
          }

      });

      const isParkingAvenue = await this.db.parkingAvenue.findUnique({
          where: {
            id: dto.parkingAvenueId
          },
          select: {
            id: true
          }

      });

      if(!isParkingAvenue){
        throw new NotFoundException("This parking avenue does not exist")
      }
    
      if(!isCustomer && !isWarden){
        throw new NotFoundException("You must be a customer or warden to be able to report an incident  ")
      }

     return await this.db.incidentReport.create({
      data: {
        category: dto.category,
        reason: dto.reason,
        parkingAvenueId: dto.parkingAvenueId,
        customerId: isCustomer ? isCustomer.id : null,
        wardenId: isWarden ? isWarden.id : null 
       },
    });


  }


  async getReportsByOwner(ownerId: string, parkingAvenueId: string) {

    const avenue = await this.db.parkingAvenue.findFirst({
      where: {
        id: parkingAvenueId,
        ownerId: ownerId,
      },
    });

    if (!avenue) {
      throw new UnauthorizedException('You are not authorized to view reports for this avenue, or the avenue does not exist.');
    }

    return await this.db.incidentReport.findMany({
      where: {
        parkingAvenueId: parkingAvenueId,
      },
      orderBy: {
        createdAt: 'desc', 
      },
      include: {
        customer: { select: { username: true, firstName: true } },
        warden: { select: { username: true, firstName: true } },
      }
    });
  }

  async getReportsForWarden(wardenId: string) {

    const warden = await this.db.warden.findUnique({
      where: { id: wardenId },
      select: { parkingAvenueId: true },
    });

    if (!warden) {
      throw new NotFoundException('Warden profile not found');
    }

    return await this.db.incidentReport.findMany({
      where: {
        parkingAvenueId: warden.parkingAvenueId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        customer: { select: { firstName: true, lastName: true } },
        warden: { select: { firstName: true, lastName: true } },
      }
    });
  }

}
