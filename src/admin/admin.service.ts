import { Injectable, ConflictException, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';
import { Admin, ParkingAvenueType } from '@prisma/client';
import { GetByApprovalStatus } from './dto/get-by-approval-status.dto';
import { UpdateApprovalStatus } from './dto/update-approval-status.dto';
import { UpdateVerificationDto } from './dto/update-verification-dto';
import { EmailService } from 'src/email/email.service';
import { AdminKpiDto, DetailedAnalyticsDto, WeeklyUtilizationDto } from './dto/dashboard.dto';
const PAGE_SIZE = 10;

@Injectable()
export class AdminService {

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) { }

  paginate(items: any[]) {
    const hasMore = items.length > PAGE_SIZE;
    const data = hasMore ? items.slice(0, PAGE_SIZE) : items;
    const nextCursor = hasMore
      ? data[data.length - 1].id
      : null;

    return { data, hasMore, nextCursor };
  }

  async register(createAdminDto: CreateAdminDto) {
    if (!createAdminDto.password.length || createAdminDto.password.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }

    const userCheck = await this.db.admin.findUnique({
      where: { username: createAdminDto.username },
    });

    if (userCheck) {
      throw new ConflictException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(createAdminDto.password, 10);
    const registeredUser = await this.db.admin.create({
      data: {
        username: createAdminDto.username,
        password: hashedPassword,
      },
    });


    return {
      admin: {
        username: createAdminDto.username,
      },
      message: 'Registration successful',
    };
  }

  async login(updateAdminDto: UpdateAdminDto) {

    if (!updateAdminDto.username) {
      throw new BadRequestException('Enter username to login');
    }
    if (!updateAdminDto.password) {
      throw new BadRequestException('Password is required');
    }

    const user = await this.db.admin.findUnique({ where: { username: updateAdminDto.username! } });

    if (updateAdminDto.username && !user) {
      throw new NotFoundException('Invalid username credentials');
    }

    const isPasswordMatch = await bcrypt.compare(updateAdminDto.password, user!.password);

    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid password credentials');
    }

    await this.db.admin.update({
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

  async parkingAvenueOwnerStatus(getByApprovalStatus: GetByApprovalStatus, adminId: string, cursor?: string) {

    const isAdmin = await this.db.admin.findUnique({
      where: {
        id: adminId
      }
    });

    if (!isAdmin) {
      throw new UnauthorizedException("Only admin is allowed to view approval status")
    }

    const ownersList = await this.db.parkingAvenueOwner.findMany({
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      where: {
        isVerified: getByApprovalStatus.approvalStatus,
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'asc' }
      ],
      take: PAGE_SIZE + 1,
      omit: {
        password: true,
      },
    });

    return this.paginate(ownersList);

  }

  async updateVerificationStatus(updateVerificationDto: UpdateVerificationDto, adminId: string) {

    const isAdmin = await this.db.admin.findUnique({
      where: {
        id: adminId
      }
    });

    if (!isAdmin) {
      throw new UnauthorizedException("Only admin can perform this action.")
    }

    if (updateVerificationDto.approvalStatus === 'REJECTED' && !updateVerificationDto.rejectionReason) {
      throw new BadRequestException("Rejection reason is required when rejecting an owner.");
    }

    const owner = await this.db.parkingAvenueOwner.findUnique({
      where: { username: updateVerificationDto.username }
    });

    if (!owner) throw new NotFoundException("Owner not found");

    const updateStatus = await this.db.parkingAvenueOwner.update({
      where: {
        username: updateVerificationDto.username,
      },
      data: {
        isVerified: updateVerificationDto.approvalStatus,
        rejectionReason: updateVerificationDto.approvalStatus === 'APPROVED'
          ? null : updateVerificationDto.rejectionReason,
      },
      omit: {
        password: true
      }
    });

    if (updateVerificationDto.approvalStatus === "APPROVED") {
      updateVerificationDto.rejectionReason = '';
    }

    try {
      await this.emailService.sendVerificationEmail(
        owner.email,
        owner.firstName,
        updateVerificationDto.approvalStatus,
        `Your parking avenue owner account status has been updated to`,
        updateVerificationDto.rejectionReason
      );
    } catch (error) {
      console.error("Failed to send email", error);
    }

    return updateStatus

  }

  async getDashboardStats() {
    const [
      totalProviders,
      activeLocations,
      onStreetSegments,
      offStreetLots,
      // TODO: add wardens summary here after the module is created
      totalUsers,
      activeReservations,
      totalRevenue,
    ] = await Promise.all([
      this.db.parkingAvenueOwner.count(),
      this.db.parkingAvenue.count(),
      this.db.parkingAvenue.count({
        where: { type: ParkingAvenueType.ON_STREET },
      }),
      this.db.parkingAvenue.count({
        where: { type: ParkingAvenueType.OFF_STREET },
      }),
      this.db.customer.count(),
      this.db.reservation.count({
        where: { status: 'CONFIRMED' },
      }),

      this.db.reservation.aggregate({
        _sum: { totalPrice: true },
        where: { status: 'CONFIRMED' },
      }),
    ]);

    return {
      cards: {
        totalProviders,
        activeLocations,
        onStreetSegments,
        offStreetLots,
        totalUsers,
        activeReservations,
        totalRevenue: totalRevenue._sum.totalPrice || 0,
      },
    };
  }


  async getByApprovalStatus(getByApprovalStatus: GetByApprovalStatus, adminId: string, cursor?: string) {

    const checkAdminId = await this.db.admin.findUnique(
      {
        where: {
          id: adminId
        }
      }
    );

    if (!checkAdminId) {
      throw new NotFoundException("Only admin is allowed to view approval status")
    }

    const parkingAvenuesByStatus = await this.db.parkingAvenue.findMany(
      {
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        where: {
          approvalStatus: getByApprovalStatus.approvalStatus,
        },
        orderBy: [
          { createdAt: 'desc' },
          { id: 'asc' }
        ],
        take: PAGE_SIZE + 1
      }
    );

    return this.paginate(parkingAvenuesByStatus);

  }

  async updateApprovalStatus(updateApprovalStatus: UpdateApprovalStatus, adminId: string) {

    const checkAdminId = await this.db.admin.findUnique(
      {
        where: {
          id: adminId
        }
      }
    );

    if (!checkAdminId) {
      throw new NotFoundException("Only admin can perform this action,")
    }

    if (updateApprovalStatus.approvalStatus === 'REJECTED' && !updateApprovalStatus.rejectionReason) {
      throw new BadRequestException("Rejection reason is required when rejecting parking avenue.");
    }

    const parkingAvenue = await this.db.parkingAvenue.findUnique(
      {
        where: {
          id: updateApprovalStatus.id
        },
        include: {
          owner: true
        }
      }
    );

    if (!parkingAvenue) {
      throw new NotFoundException('Parking avenue with this id does not exist')
    }

    const updateStatus = await this.db.parkingAvenue.update(
      {
        where: {
          id: updateApprovalStatus.id
        },
        data: {
          approvalStatus: updateApprovalStatus.approvalStatus,
          rejectionReason: updateApprovalStatus.approvalStatus === 'APPROVED' ?
            null : updateApprovalStatus.rejectionReason,
        }
      }
    );

    if (updateApprovalStatus.approvalStatus === "APPROVED") {
      updateApprovalStatus.rejectionReason = '';
    }

    try {
      await this.emailService.sendVerificationEmail(
        parkingAvenue.owner.email,
        parkingAvenue.owner.firstName,
        updateApprovalStatus.approvalStatus,
        `Your parking avenue status has been updated to`,
        updateApprovalStatus.rejectionReason
      );
    } catch (error) {
      console.error("Failed to send approval email", error);
    }

    return updateStatus
  }


  async getGlobalOverview(adminId: string) {

    const checkAdminId = await this.db.admin.findUnique(
      {
        where: {
          id: adminId
        }
      }
    );

    if (!checkAdminId) {
      throw new NotFoundException("Only admin is allowed to view this overview")
    }

    const [totalProviders, activeLocations, onStreetLots, offStreetLots] = await this.db.$transaction([
      this.db.parkingAvenueOwner.count(),

      this.db.parkingAvenue.count({
        where: { status: 'OPEN' }
      }),

      this.db.parkingAvenue.count({
        where: { type: 'ON_STREET' }
      }),

      this.db.parkingAvenue.count({
        where: { type: 'OFF_STREET' }
      })
    ]);

    return {
      totalProviders,
      activeLocations,
      onStreetLots,
      offStreetLots,
    };
  }

  async getParkingLotsStatus() {


    const parkingLots = await this.db.parkingAvenue.findMany({
      select: {
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        totalSpots: true,
        currentSpots: true,
      },
    });

    return parkingLots.map((lot) => {
      let status: 'AVAILABLE' | 'HIGH_DEMAND' | 'FULL';

      if (lot.currentSpots >= lot.totalSpots) {
        status = 'FULL';
      }
      else if (lot.currentSpots >= lot.totalSpots * 0.8) {
        status = 'HIGH_DEMAND';
      }
      else {
        status = 'AVAILABLE';
      }

      return {
        name: lot.name,
        location: lot.address,
        coordinates: {
          lat: lot.latitude,
          lng: lot.longitude,
        },
        status,
      };
    });
  }

  async getWithoutApprovalStatus(adminId: string, cursor?: string) {

    const checkAdminId = await this.db.admin.findUnique(
      {
        where: {
          id: adminId
        }
      }
    );

    if (!checkAdminId) {
      throw new NotFoundException("Only admin is allowed to view approval status")
    }

    const parkingAvenues = await this.db.parkingAvenue.findMany(
      {
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        orderBy: [
          { createdAt: 'desc' },
          { id: 'asc' }
        ],
        take: PAGE_SIZE + 1
      }
    );

    return this.paginate(parkingAvenues);

  }


  async parkingAvenueOwnerWithoutApprovalStatus(adminId: string, cursor?: string) {
    const isAdmin = await this.db.admin.findUnique({ where: { id: adminId } });

    if (!isAdmin) {
      throw new UnauthorizedException("Only admin is allowed to view approval status");
    }

    const unverifiedOwnersList = await this.db.parkingAvenueOwner.findMany({
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: [
        { createdAt: 'desc' },
        { id: 'asc' }
      ],
      omit: { password: true },
      take: PAGE_SIZE + 1,
      include: {
        parkingAvenues: {
          select: {
            totalSpots: true,
          },
        },
      },
    });

    const ownersWithStats = unverifiedOwnersList.map((owner) => {
      const totalLocations = owner.parkingAvenues.length;
      const totalSpaces = owner.parkingAvenues.reduce((acc, curr) => acc + curr.totalSpots, 0);

      const { parkingAvenues, ...ownerData } = owner;

      return {
        ...ownerData,
        totalLocations,
        totalSpaces,
      };
    });

    return this.paginate(ownersWithStats);
  }

  async getDashboardKpis(): Promise<AdminKpiDto> {
    const [wardensOnDuty, activeCheckIns, confirmedReservations, avenueStats] = await this.db.$transaction([
      this.db.warden.count({
        where: { wardenStatus: 'ONDUTY' },
      }),

      this.db.checkIn.count({
        where: { status: 'ACTIVE' },
      }),

      this.db.reservation.count({
        where: { status: 'CONFIRMED' },
      }),

      this.db.parkingAvenue.aggregate({
        _sum: {
          totalSpots: true,
          currentSpots: true,
        },
      }),
    ]);

    const totalSpots = avenueStats._sum.totalSpots || 0;
    const availableSpots = avenueStats._sum.currentSpots || 0;
    const occupiedSpots = totalSpots - availableSpots;

    const overallUtilizationRate = totalSpots > 0
      ? Math.round((occupiedSpots / totalSpots) * 100)
      : 0;

    return {
      wardensOnDuty,
      activeCheckIns,
      confirmedReservations,
      overallUtilizationRate,
    };
  }

  async getWeeklyUtilizationTrend(): Promise<WeeklyUtilizationDto[]> {
    const rawData: any[] = await this.db.$queryRaw`
      SELECT 
        DATE(o."timestamp")::text as "date",
        p."type" as "type",
        AVG(o."occupancyRate") as "avgRate"
      FROM "OccupancyLog" o
      JOIN "ParkingAvenue" p ON o."parkingAvenueId" = p."id"
      WHERE o."timestamp" >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(o."timestamp"), p."type"
      ORDER BY "date" ASC
    `;

    const trendsMap = new Map<string, WeeklyUtilizationDto>();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      const dayName = dayNames[d.getDay()];

      trendsMap.set(dateStr, {
        day: dayName,
        onStreet: 0,
        offStreet: 0,
      });
    }

    rawData.forEach((row) => {
      const dateStr = row.date;
      const type = row.type;
      const rate = parseFloat(row.avgRate) || 0;

      if (trendsMap.has(dateStr)) {
        const data = trendsMap.get(dateStr)!;

        if (type === 'ON_STREET') {
          data.onStreet = Math.round(rate);
        } else if (type === 'OFF_STREET') {
          data.offStreet = Math.round(rate);
        }
      }
    });

    return Array.from(trendsMap.values());
  }

  async getDetailedAnalytics(): Promise<DetailedAnalyticsDto> {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      avenueAggregates,
      zoneStats,
      peakHoursRaw,
      parkingDistRaw,
      currentMonthCheckInRev,
      currentMonthResRev,
      lastMonthCheckInRev,
      lastMonthResRev
    ] = await Promise.all([
      // Overall Utilization
      this.db.parkingAvenue.aggregate({
        _sum: { totalSpots: true, currentSpots: true },
      }),

      // Zone Utilization (grouped by subCity)
      this.db.parkingAvenue.groupBy({
        by: ['subCity'],
        _sum: { totalSpots: true, currentSpots: true },
      }),

      // Peak Hours
      this.db.occupancyLog.groupBy({
        by: ['hour'],
        _avg: { occupancyRate: true },
        orderBy: { hour: 'asc' },
      }),

      // Parking Distribution (ON_STREET vs OFF_STREET)
      this.db.parkingAvenue.groupBy({
        by: ['type'],
        _count: { _all: true },
      }),

      // Revenue Data (Current Month)
      this.db.checkIn.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: startOfCurrentMonth } },
        _sum: { calculatedAmount: true },
      }),
      this.db.reservation.aggregate({
        where: { status: { in: ['CONFIRMED', 'FULFILLED'] }, createdAt: { gte: startOfCurrentMonth } },
        _sum: { totalPrice: true },
      }),

      // Revenue Data (Last Month)
      this.db.checkIn.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: startOfLastMonth, lt: startOfCurrentMonth } },
        _sum: { calculatedAmount: true },
      }),
      this.db.reservation.aggregate({
        where: { status: { in: ['CONFIRMED', 'FULFILLED'] }, createdAt: { gte: startOfLastMonth, lt: startOfCurrentMonth } },
        _sum: { totalPrice: true },
      }),
    ]);

    const totalSpots = avenueAggregates._sum.totalSpots || 0;
    const availableSpots = avenueAggregates._sum.currentSpots || 0;
    const occupiedSpots = totalSpots - availableSpots;
    const averageUtilization = totalSpots > 0 ? Math.round((occupiedSpots / totalSpots) * 100) : 0;

    const currentRevenue = (currentMonthCheckInRev._sum.calculatedAmount || 0) + (currentMonthResRev._sum.totalPrice || 0);
    const lastRevenue = (lastMonthCheckInRev._sum.calculatedAmount || 0) + (lastMonthResRev._sum.totalPrice || 0);
    let revenueGrowth = 0;
    if (lastRevenue > 0) {
      revenueGrowth = Math.round(((currentRevenue - lastRevenue) / lastRevenue) * 100);
    } else if (currentRevenue > 0) {
      revenueGrowth = 100;
    }

    const zoneUtilization = zoneStats.map(zone => {
      const zTotal = zone._sum.totalSpots || 0;
      const zAvailable = zone._sum.currentSpots || 0;
      const zOccupied = zTotal - zAvailable;
      const rate = zTotal > 0 ? Math.round((zOccupied / zTotal) * 100) : 0;

      return {
        label: zone.subCity,
        value: rate,
      };
    }).sort((a, b) => b.value - a.value);

    // Hottest Zone is the first /lement after sorting
    const hottestZoneData = zoneUtilization.length > 0
      ? zoneUtilization[0]
      : { label: 'N/A', value: 0 };

    const fullDay = Array.from({ length: 24 }, (_, i) => ({
      label: i === 12 ? '12 PM' : i > 12 ? `${i - 12} PM` : i === 0 ? '12 AM' : `${i} AM`,
      value: 0,
    }));
    peakHoursRaw.forEach(item => {
      fullDay[item.hour].value = Math.round(item._avg.occupancyRate || 0);
    });

    // Find the peek hour range (2-hour window)
    let maxRate = -1;
    let peakHour = 0;

    fullDay.forEach((item, index) => {
      if (item.value > maxRate) {
        maxRate = item.value;
        peakHour = index;
      }
    });

    const formatHour = (h: number) => {
      const hh = h % 24;
      return hh === 12 ? '12 PM' : hh > 12 ? `${hh - 12} PM` : hh === 0 ? '12 AM' : `${hh} AM`;
    };

    const peakHours = `${formatHour(peakHour)} - ${formatHour(peakHour + 2)}`;

    const parkingDistribution = parkingDistRaw.map(dist => ({
      label: dist.type === 'ON_STREET' ? 'On-Street' : 'Off-Street',
      value: dist._count._all,
    }));

    return {
      averageUtilization,
      revenueGrowth,
      hottestZone: {
        subCity: hottestZoneData.label as string,
        utilization: hottestZoneData.value,
      },
      zoneUtilization,
      peakHours,
      parkingDistribution,
    };
  }


  async getReservationDashboard(adminId: string) {

    const isAdmin = await this.db.admin.findUnique({ where: { id: adminId } });

    if (!isAdmin) {
      throw new UnauthorizedException("Only admin is allowed to view warden stats");
    }

    const now = new Date();

    const activeReservations = await this.db.reservation.count({
      where: {
        status: 'CONFIRMED',
        startTime: { lte: now },
        endTime: { gte: now },
      },
    });

    const upcomingReservations = await this.db.reservation.count({
      where: {
        status: 'CONFIRMED',
        startTime: { gt: now },
      },
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const revenueAggregation = await this.db.reservation.aggregate({
      where: {
        status: 'FULFILLED',
        startTime: {
          gte: startOfDay,
        },
      },
      _sum: {
        totalPrice: true,
      },
    });

    return {
      activeReservations,
      upcomingReservations,
      todaysRevenue: revenueAggregation._sum.totalPrice || 0,
    };
  }

  async getPeakDemandData(adminId: string) {

    const isAdmin = await this.db.admin.findUnique({ where: { id: adminId } });

    if (!isAdmin) {
      throw new UnauthorizedException("Only admin is allowed to view warden stats");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reservations = await this.db.reservation.findMany({
      where: {
        createdAt: { gte: today },
        status: { not: 'CANCELLED' },
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
