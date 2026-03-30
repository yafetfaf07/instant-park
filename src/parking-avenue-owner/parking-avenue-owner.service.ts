import { Injectable, BadRequestException, ConflictException, UnauthorizedException, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { CreateParkingAvenueOwnerDto } from './dto/create-parking-avenue-owner.dto';
import { UpdateParkingAvenueOwnerDto } from './dto/update-parking-avenue-owner.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, fromEvent } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { LiveActivityEvent } from '../event/live-activity.event';
import { EmailService } from 'src/email/email.service';
import { GetDashboardOverviewDto } from './dto/get-dashboard-overview.dto';
import { GetTodayOccupancyChartDto } from './dto/get-today-occupancy-chart.dto';
import { CreateParkingAvenueOwnerByAdminDto } from './dto/create-parking-avenue-owner-by-admin.dto';
import * as fs from 'fs';
const PAGE_SIZE = 10;

@Injectable()
export class ParkingAvenueOwnerService {
  private readonly logger = new Logger(ParkingAvenueOwnerService.name); 
  constructor( 
    private readonly db: DatabaseService, 
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2,
    private readonly  emailService: EmailService,

  ) {}

  paginate(items: any[]) {
      const hasMore = items.length > PAGE_SIZE;
      const data = hasMore ? items.slice(0, PAGE_SIZE) : items;
      const nextCursor = hasMore
        ? data[data.length - 1].id
        : null;

        return { data, hasMore, nextCursor };
    }
  
    async register(createParkingAvenueOwnerDto: CreateParkingAvenueOwnerDto) {
        
        if (!createParkingAvenueOwnerDto.password.length || createParkingAvenueOwnerDto.password.length < 8) {
          throw new BadRequestException(
            'Password must be at least 8 characters long',
          );
        }
  
        const userCheck = await this.db.parkingAvenueOwner.findFirst({
          where: {
            OR: [
                  { username: createParkingAvenueOwnerDto.username },
                  { email: createParkingAvenueOwnerDto.email },
                  { phoneNo: createParkingAvenueOwnerDto.phoneNo },
              ]
          }
        });
  
        if (userCheck){
          if(userCheck.email == createParkingAvenueOwnerDto.email ){
            throw new ConflictException('email already exists');
          }

          if(userCheck.phoneNo == createParkingAvenueOwnerDto.phoneNo){
            throw new ConflictException('phoneNo already exists');
          }

          if(userCheck.username == createParkingAvenueOwnerDto.username){
            throw new ConflictException('username already exists');
          }
        }
  
        const hashedPassword = await bcrypt.hash(createParkingAvenueOwnerDto.password, 10);
        const registeredUser = await this.db.parkingAvenueOwner.create({
          data: {
            firstName: createParkingAvenueOwnerDto.firstName,
            lastName: createParkingAvenueOwnerDto.lastName,
            phoneNo: createParkingAvenueOwnerDto.phoneNo,
            email: createParkingAvenueOwnerDto.email,
            username: createParkingAvenueOwnerDto.username,
            password: hashedPassword,
            personalId: createParkingAvenueOwnerDto.personalId
          },
        });
  
          
        return {
          parkingAvenueOwner: {
            username: createParkingAvenueOwnerDto.username,
          },
          message: 'Registration successful',
        };
      }
  
      async login(updateParkingAvenueOwnerDto: UpdateParkingAvenueOwnerDto) {
  
        if (!updateParkingAvenueOwnerDto.username) {
          throw new BadRequestException('Enter username to login');
        }
        if (!updateParkingAvenueOwnerDto.password) {
          throw new BadRequestException('Password is required');
        }
  
        const user = await this.db.parkingAvenueOwner.findUnique({ where: { username: updateParkingAvenueOwnerDto.username! } });
        
        if (updateParkingAvenueOwnerDto.username && !user) {
          throw new NotFoundException('Invalid username credentials');
        }
    
        const isPasswordMatch = await bcrypt.compare(updateParkingAvenueOwnerDto.password, user!.password);
  
        if (!isPasswordMatch) {
          throw new UnauthorizedException('Invalid password credentials');
        }
  
        await this.db.parkingAvenueOwner.update({
            where: {
                id: user!.id,
            },
            data: {
                lastLogin: new Date(),
            },
        });
  
        const payload = {
          sub: user!.id,
        };
        const accessToken = this.jwtService.sign(payload);
  
        return { accessToken };
      }

  async getProfile(id: string) {
    const parkingAvenueOwner = await this.db.parkingAvenueOwner.findUnique({
      where: { id },
      select: {
        id: true,
        phoneNo: true,
        firstName: true,
        username: true,
        lastName: true,
        email: true,
        isVerified: true,
      },
    });

    if (!parkingAvenueOwner) {
      throw new NotFoundException('Parking avenue owner not found');
    }
    return parkingAvenueOwner;
  }
async getLiveActivityStream(ownerId: string): Promise<Observable<MessageEvent>> {
    const avenues = await this.db.parkingAvenue.findMany({
      where: { ownerId },
      select: { id: true },
    });

    const ownedAvenueIds = new Set(avenues.map((avenue) => avenue.id));

    this.logger.log(`Owner ${ownerId} connected to SSE. Listening for ${ownedAvenueIds.size} avenues.`);

    return fromEvent(this.eventEmitter, 'live.activity').pipe(
      filter((event: LiveActivityEvent) => ownedAvenueIds.has(event.parkingAvenueId)),
      
      map((event: LiveActivityEvent) => {
        return {
          data: event,
        } as MessageEvent;
      }),
    );
  }  

  async forgotPassword(email: string) {
    const user = await this.db.parkingAvenueOwner.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');

    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60000);

    await this.db.parkingAvenueOwner.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });
    
    try {
      await this.emailService.sendForgotPasswordEmail(email, user.firstName, token);
      return "Sent email successfully."
    }
    catch(error){
        console.error("Failed to send email", error);
    }

  }

  async resetPassword(email: string, token: string, newPassword: string) {
    const user = await this.db.parkingAvenueOwner.findUnique({ where: { email } });
    
    if (!user || user.resetToken !== token || new Date() > user.resetTokenExpiry!) {
      throw new BadRequestException('Invalid or expired token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await this.db.parkingAvenueOwner.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword, 
        resetToken: null, 
        resetTokenExpiry: null 
      },
    });

    return { message: 'Password updated successfully' };
  }

  async getWardensForOwner(ownerId: string, cursor?: string, limit: number = 10) {

    const avenues = await this.db.parkingAvenue.findMany({
      where: { ownerId },
      select: { id: true },
    });
    const avenueIds = avenues.map((a) => a.id);

    const wardens = await this.db.warden.findMany({
      where: { parkingAvenueId: { in: avenueIds } },
      take: limit + 1, 
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' }, 
      include: { parkingAvenue: { select: { name: true } } },
    });

    const { data, hasMore, nextCursor } = this.paginate(wardens);

    const totalCount = await this.db.warden.count({
      where: { parkingAvenueId: { in: avenueIds } },
    });

    return { data, totalCount, hasMore, nextCursor };
}
async getDashboardOverview(ownerId: string): Promise<GetDashboardOverviewDto> {
    const avenues = await this.db.parkingAvenue.findMany({
      where: { ownerId: ownerId },
      select: { id: true },
    });

    const avenueIds = avenues.map((ave) => ave.id);

    if (avenueIds.length === 0) {
      return {
        totalSpots: 0,
        availableSpotsNow: 0,
        activeReservationsCount: 0,
        onDutyWardenCount: 0,
      };
    }

    const [parkingAvenueAggregates, activeReservations, onDutyWardens] = await this.db.$transaction([
      this.db.parkingAvenue.aggregate({
        where: { ownerId: ownerId },
        _sum: {
          totalSpots: true,
          currentSpots: true,
        },
      }),

      this.db.reservation.count({
        where: {
          parkingAvenueId: { in: avenueIds },
          status: 'CONFIRMED',
        },
      }),

      this.db.warden.count({
        where: {
          parkingAvenueId: { in: avenueIds },
          wardenStatus: 'ONDUTY',
        },
      }),
    ]);

    return {
      totalSpots: parkingAvenueAggregates._sum.totalSpots || 0,
      availableSpotsNow: parkingAvenueAggregates._sum.currentSpots || 0,
      activeReservationsCount: activeReservations,
      onDutyWardenCount: onDutyWardens,
    };
  }

  async getTodayOccupancyChartData(ownerId: string): Promise<GetTodayOccupancyChartDto> {
    const avenues = await this.db.parkingAvenue.findMany({
      where: { ownerId: ownerId },
      select: { id: true },
    });

    const avenueIds = avenues.map((ave) => ave.id);

    if (avenueIds.length === 0) {
      return this.generateEmpty24HourArray();
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const occupancyLogsAggregated = await this.db.occupancyLog.groupBy({
      by: ['hour'],
      where: {
        parkingAvenueId: { in: avenueIds },
        timestamp: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      _avg: {
        occupancyRate: true,
      },
      orderBy: {
        hour: 'asc',
      },
    });

    const fullDayData: GetTodayOccupancyChartDto = this.generateEmpty24HourArray();

    occupancyLogsAggregated.forEach((log) => {
      fullDayData[log.hour].averageOccupancyRate = log._avg.occupancyRate || 0;
    });

    return fullDayData;
  }

  private generateEmpty24HourArray(): GetTodayOccupancyChartDto {
    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      averageOccupancyRate: 0,
    }));
  }

   async createOwnerByAdmin(createParkingAvenueOwnerByAdminDto: CreateParkingAvenueOwnerByAdminDto, adminId: string) {

    const isAdmin = await this.db.admin.findUnique({
        where: {
          id: adminId
        }
      });

      if(!isAdmin){
        throw new UnauthorizedException("Only admin is allowed to view approval status")
      }
    const plainPassword = Math.random().toString(36).slice(-8) + 'A1!'; 
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const userCheck = await this.db.parkingAvenueOwner.findFirst({
          where: {
            OR: [
                  { username: createParkingAvenueOwnerByAdminDto.username },
                  { email: createParkingAvenueOwnerByAdminDto.email },
                  { phoneNo: createParkingAvenueOwnerByAdminDto.phoneNo },
              ]
          }
        });
  
    if (userCheck){
      if(userCheck.email == createParkingAvenueOwnerByAdminDto.email ){
        throw new ConflictException('email already exists');
      }

        if(userCheck.phoneNo == createParkingAvenueOwnerByAdminDto.phoneNo){
            throw new ConflictException('phoneNo already exists');
          }

          if(userCheck.username == createParkingAvenueOwnerByAdminDto.username){
            throw new ConflictException('username already exists');
          }
        }

    const newOwner = await this.db.parkingAvenueOwner.create({
      data: {
        ...createParkingAvenueOwnerByAdminDto,
        password: hashedPassword,
        isCreatedByAdmin: true
      },
    });

   
    try {
        await this.emailService.sendParkingAvenueOwnerCreatedEmail(
          newOwner.email,
          newOwner.firstName,
          newOwner.username,
          newOwner.password
        );
      } catch (error) {
        console.error("Failed to send email", error);
      }

    return { message: 'Owner created successfully', username: createParkingAvenueOwnerByAdminDto.username, tempPassword: plainPassword };
  }

  async resendCredentials(email: string) {
    const user = await this.db.parkingAvenueOwner.findUnique({ where: { email } });

    if (!user) throw new NotFoundException('User not found');

    if (!user.isCreatedByAdmin) {
      throw new BadRequestException('Account is already activated. Use "Forgot Password" instead.');
    }

    const newTempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const hashedPassword = await bcrypt.hash(newTempPassword, 10);

    await this.db.parkingAvenueOwner.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    
    try {
      await this.emailService.sendParkingAvenueOwnerCreatedEmail(
        email,
        user.firstName,
        user.username,
        newTempPassword
      );
    } catch (error) {
      console.error("Failed to send email", error);
    }
  return { message: 'Credentials have been resent to your email' };
}


  async updateProfile(id: string, dto: UpdateParkingAvenueOwnerDto) {

    const existingOwner = await this.db.parkingAvenueOwner.findUnique({ where: { id } });

    const updateData: any = { ...dto };

    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

     if (dto.personalId && existingOwner?.personalId) {
        if (fs.existsSync(existingOwner.personalId)) {
          fs.unlinkSync(existingOwner.personalId);
        }
      }

    const conflicts = await this.db.parkingAvenueOwner.findFirst({
      where: {
        NOT: { id },
        OR: [
          { username: dto.username },
          { email: dto.email },
          { phoneNo: dto.phoneNo },
        ],
      },
    });

    if (conflicts) {
      if (conflicts.username === dto.username) throw new ConflictException('Username taken');
      if (conflicts.email === dto.email) throw new ConflictException('Email taken');
      if (conflicts.phoneNo === dto.phoneNo) throw new ConflictException('Phone number taken');
    }

    try {
      return await this.db.parkingAvenueOwner.update({
        where: { id },
        data: updateData,
        select: { 
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          phoneNo: true,
          email: true,
        }
      });
    } catch (error) {
      throw new InternalServerErrorException('Update failed');
    }
  }

}
