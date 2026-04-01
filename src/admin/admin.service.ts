import { Injectable, ConflictException, BadRequestException, NotFoundException,UnauthorizedException } from '@nestjs/common';
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
const PAGE_SIZE = 10;

@Injectable()
export class AdminService {
  
    constructor( 
      private readonly db: DatabaseService, 
      private readonly jwtService: JwtService, 
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

    async register(createAdminDto: CreateAdminDto) {
      if (!createAdminDto.password.length || createAdminDto.password.length < 8) {
        throw new BadRequestException(
          'Password must be at least 8 characters long',
        );
      }

      const userCheck = await this.db.admin.findUnique({
        where: { username: createAdminDto.username },
      });

      if (userCheck){
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

      if(!isAdmin){
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

    async updateVerificationStatus(updateVerificationDto: UpdateVerificationDto, adminId: string){
      
      const isAdmin = await this.db.admin.findUnique({
        where: {
          id: adminId
        }
      });

      if(!isAdmin){
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

      if(updateVerificationDto.approvalStatus ==="APPROVED"){
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
        where: {type: ParkingAvenueType.ON_STREET }, 
      }),
      this.db.parkingAvenue.count({
        where: {type: ParkingAvenueType.OFF_STREET }, 
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


  async getByApprovalStatus(getByApprovalStatus: GetByApprovalStatus, adminId: string, cursor?: string){

    const checkAdminId = await this.db.admin.findUnique(
      {
        where: {
          id: adminId
        }
      }
    );

    if(!checkAdminId){
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

  async updateApprovalStatus(updateApprovalStatus: UpdateApprovalStatus, adminId: string){

    const checkAdminId = await this.db.admin.findUnique(
      {
        where: {
          id: adminId
        }
      }
    );

    if(!checkAdminId){
      throw new NotFoundException("Only admin can perform this action,")
    }

    if(updateApprovalStatus.approvalStatus === 'REJECTED' && !updateApprovalStatus.rejectionReason){
        throw new BadRequestException("Rejection reason is required when rejecting parking avenue.");
    }

    const parkingAvenue = await this.db.parkingAvenue.findUnique(
      {
        where: {
          id: updateApprovalStatus.id
        },
        include : {
          owner: true
        }
      }
    );

    if(!parkingAvenue){
      throw new NotFoundException('Parking avenue with this id does not exist')
    }

    const updateStatus = await this.db.parkingAvenue.update(
      {
        where: {
          id: updateApprovalStatus.id
        },
        data: {
          approvalStatus: updateApprovalStatus.approvalStatus,
          rejectionReason: updateApprovalStatus.approvalStatus === 'APPROVED'?
            null : updateApprovalStatus.rejectionReason,
        }
      }
    );

    if(updateApprovalStatus.approvalStatus ==="APPROVED"){
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

    if(!checkAdminId){
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

  async getWithoutApprovalStatus(adminId: string, cursor?: string){

      const checkAdminId = await this.db.admin.findUnique(
        {
          where: {
            id: adminId
          }
        }
      );

      if(!checkAdminId){
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

}
