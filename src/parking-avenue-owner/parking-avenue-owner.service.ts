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
import { WardenStatus } from '@prisma/client';
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

async getTodayOccupancyChartData(ownerId: string): Promise<any[]> {
  const avenues = await this.db.parkingAvenue.findMany({
    where: { ownerId: ownerId },
    select: { id: true },
  });

  const avenueIds = avenues.map((ave) => ave.id);

  const result = Array.from({ length: 24 }, (_, hour) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return {
      time: `${displayHour} ${period}`,
      occupancy: 0,
    };
  });

  if (avenueIds.length === 0) {
    return result;
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

  // Map the aggregated data into our formatted array
  occupancyLogsAggregated.forEach((log) => {
    if (result[log.hour]) {
      // Rounding to nearest whole number as per your "15" example
      result[log.hour].occupancy = Math.round(log._avg.occupancyRate || 0);
    }
  });

  return result;
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

  private async getOwnedAvenueIds(ownerId: string): Promise<string[]> {
    const avenues = await this.db.parkingAvenue.findMany({
      where: { ownerId },
      select: { id: true },
    });
    return avenues.map(a => a.id);
  }

  async getAnalyticsKpis(ownerId: string) {
    const avenueIds = await this.getOwnedAvenueIds(ownerId);
    if (!avenueIds.length) return this.emptyKpis();

    const checkInStats = await this.db.checkIn.aggregate({
      where: { parkingAvenueId: { in: avenueIds }},
      _count: { id: true },
      _sum: { calculatedAmount: true },
    });

    // Calculates the difference between checkout (updatedAt) and checkin (createdAt) in hours
    const durationQuery: any[] = await this.db.$queryRaw`
      SELECT AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 3600) as "avgDuration"
      FROM "CheckIn"
      WHERE "parkingAvenueId" IN (${avenueIds.join("','")}) AND "status" = 'COMPLETED'
    `;

    const walkIns = await this.db.checkIn.count({
      where: { parkingAvenueId: { in: avenueIds }, reservationId: null }
    });
    const reservations = await this.db.checkIn.count({
      where: { parkingAvenueId: { in: avenueIds }, reservationId: { not: null } }
    });

    const avgOccupancy = await this.db.occupancyLog.aggregate({
      where: { parkingAvenueId: { in: avenueIds } },
      _avg: { occupancyRate: true }
    });

    return {
      averageOccupancyRate: avgOccupancy._avg.occupancyRate || 0,
      totalVisitors: checkInStats._count.id || 0,
      averageStayDurationHours: durationQuery[0]?.avgDuration ? parseFloat(durationQuery[0].avgDuration) : 0,
      totalRevenue: checkInStats._sum.calculatedAmount || 0,
      visitorSplit: { reservations, walkIns }
    };
  }

  async getOccupancyByDay(ownerId: string) {
    const avenueIds = await this.getOwnedAvenueIds(ownerId);
    if (!avenueIds.length) return [];

    const grouped = await this.db.occupancyLog.groupBy({
      by: ['dayOfWeek'],
      where: { parkingAvenueId: { in: avenueIds } },
      _avg: { occupancyRate: true },
      orderBy: { dayOfWeek: 'asc' }
    });

    const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return grouped.map(item => ({
      label: daysMap[item.dayOfWeek],
      value: item._avg.occupancyRate || 0
    }));
  }

   async findAverageOccupancyByOwner(ownerId: string) {
    const stats = await this.db.occupancyLog.groupBy({
      by: ['dayOfWeek'],
      where: {
        parkingAvenue: {
          ownerId: ownerId, // Filters logs for all avenues owned by this person
        },
      },
      _avg: {
        occupancyRate: true,
      },
      orderBy: {
        dayOfWeek: 'asc',
      },
    });

    const daysMap = [
      'Sun',
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
    ];

    return stats.map((item) => ({
      day: daysMap[item.dayOfWeek] || 'Unknown',
      occupancy: Number((item._avg.occupancyRate || 0).toFixed(2)),
    }));
  }

  async getPeakHours(ownerId: string) {
    const avenueIds = await this.getOwnedAvenueIds(ownerId);
    if (!avenueIds.length) return [];

    const grouped = await this.db.occupancyLog.groupBy({
      by: ['hour'],
      where: { parkingAvenueId: { in: avenueIds } },
      _avg: { occupancyRate: true },
      orderBy: { hour: 'asc' }
    });

    const fullDay = Array.from({ length: 24 }, (_, i) => ({ label: `${i}:00`, value: 0 }));
    
    grouped.forEach(item => {
      fullDay[item.hour].value = item._avg.occupancyRate || 0;
    });

    return fullDay;
  }

  async getAverageOccupancyByOwner(ownerId: string) {
  // 1. Fetch aggregation from the database
  const stats = await this.db.occupancyLog.groupBy({
    by: ['hour'],
    where: {
      parkingAvenue: {
        ownerId: ownerId,
      },
    },
    _avg: {
      occupancyRate: true,
    },
    orderBy: {
      hour: 'asc',
    },
  });

  // 2. Format the data to match your required output
  return stats.map((item) => ({
    hour: this.formatHour(item.hour),
    rate: Math.round(item._avg.occupancyRate || 0),
  }));
}

// Helper to convert 0-23 integer to "6 AM", "12 PM", etc.
private formatHour(hour: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${formattedHour} ${ampm}`;
}

 async getMonthlyRevenueTrends(ownerId: string) {
    const avenueIds = await this.getOwnedAvenueIds(ownerId);
    if (!avenueIds.length) return [];

    // 1. Get the start of the current year
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);

    // 2. Fetch all completed check-ins for the owner's avenues this year
    const checkIns = await this.db.checkIn.findMany({
      where: {
        parkingAvenueId: { in: avenueIds },
        status: 'COMPLETED',
        createdAt: { gte: startOfYear },
      },
      select: {
        createdAt: true,
        calculatedAmount: true,
        reservationId: true,
      },
    });

    // 3. Initialize the 12 months with 0
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Create the base structure: [{ month: "Jan", reservations: 0, walkins: 0 }, ...]
    const monthlyData = monthNames.map(name => ({
      month: name,
      reservations: 0,
      walkins: 0
    }));

    // 4. Aggregate data into the months
    checkIns.forEach((checkIn) => {
      const monthIndex = checkIn.createdAt.getMonth(); // 0 for Jan, 1 for Feb...
      const amount = checkIn.calculatedAmount || 0;

      if (checkIn.reservationId) {
        monthlyData[monthIndex].reservations += amount;
      } else {
        monthlyData[monthIndex].walkins += amount;
      }
    });

    // 5. Final formatting (rounding to 2 decimal places)
    return monthlyData.map(item => ({
      ...item,
      reservations: Number(item.reservations.toFixed(2)),
      walkins: Number(item.walkins.toFixed(2))
    }));
  }

 async getRevenueTrends(ownerId: string) {
    const avenueIds = await this.getOwnedAvenueIds(ownerId);
    if (!avenueIds.length) return [];

    // 1. Calculate the date 7 days ago
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6); // Include today + 6 previous days
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // 2. Fetch completed check-ins
    const recentCheckIns = await this.db.checkIn.findMany({
      where: {
        parkingAvenueId: { in: avenueIds },
        status: 'COMPLETED',
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        createdAt: true,
        calculatedAmount: true,
        reservationId: true,
      },
    });

    // 3. Initialize the Map with the last 7 days (ensures no gaps in chart)
    const trendsMap = new Map<string, { reservations: number; walkins: number }>();
    
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      // Format as "MMM dd" (e.g., "Oct 24") or "YYYY-MM-DD"
      const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      trendsMap.set(dateLabel, { reservations: 0, walkins: 0 });
    }

    // 4. Populate the map with actual revenue
    recentCheckIns.forEach((checkIn) => {
      const dateLabel = checkIn.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const amount = checkIn.calculatedAmount || 0;
      
      const data = trendsMap.get(dateLabel);
      if (data) {
        if (checkIn.reservationId) {
          data.reservations += amount;
        } else {
          data.walkins += amount;
        }
      }
    });

    // 5. Format for the frontend chart and sort by date
    // We reverse the array because the loop above generates days from Today backwards
    return Array.from(trendsMap.entries())
      .map(([date, revenues]) => ({
        date: date,
        reservations: Number(revenues.reservations.toFixed(2)),
        walkins: Number(revenues.walkins.toFixed(2)),
      }))
      .reverse(); 
  }

  private emptyKpis() {
    return {
      averageOccupancyRate: 0, totalVisitors: 0, averageStayDurationHours: 0, totalRevenue: 0,
      visitorSplit: { reservations: 0, walkIns: 0 }
    };
  }

  async getWardenStatusReport(parkingAvenueOwnerId: string) {

    const owner = await this.db.parkingAvenueOwner.findUnique({
        where: { id: parkingAvenueOwnerId },
      });

      if (!owner) throw new NotFoundException('Only parking avenue owner is allowed');

      const wardenStats = await this.db.warden.groupBy({
        by: ['wardenStatus'],
        _count: {
          id: true,
        },
        where: {
          parkingAvenue: {
            ownerId: parkingAvenueOwnerId,
          },
        },
      });

      const result = {
        onDuty: 0,
        offDuty: 0,
      };

      wardenStats.forEach((stat) => {
        if (stat.wardenStatus === WardenStatus.ONDUTY) {
          result.onDuty = stat._count.id;
        } else if (stat.wardenStatus === WardenStatus.OFFDUTY) {
          result.offDuty = stat._count.id;
        }
      });

      return result;
    }


    async getPeakDemandData(ownerId: string) {
      
      const myAvenues = await this.db.parkingAvenue.findMany({
        where: { ownerId },
        select: { id: true },
      });

      const avenueIds = myAvenues.map((a) => a.id);

      if (avenueIds.length === 0) {
        return []; 
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const reservations = await this.db.reservation.findMany({
        where: {
          createdAt: { gte: today },
          status: { not: 'CANCELLED' },
          parkingAvenueId: { in: avenueIds }, 
        },
        select: {
          startTime: true,
        },
      });

      const demandMap: Record<number, number> = {};
      for (let i = 6; i <= 22; i++) {
        demandMap[i] = 0;
      }

      reservations.forEach((res) => {
        const hour = res.startTime.getHours();
        if (demandMap.hasOwnProperty(hour)) {
          demandMap[hour]++;
        }
      });

      return Object.entries(demandMap).map(([hour, count]) => ({
        time: this.formatHourLabel(parseInt(hour)),
        reservations: count,
      }));
    }

    private formatHourLabel(hour: number): string {
      if (hour === 12) return '12PM';
      if (hour === 0) return '12AM';
      return hour > 12 ? `${hour - 12}PM` : `${hour}AM`;
    }
}
