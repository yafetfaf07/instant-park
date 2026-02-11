import { Injectable, ConflictException, BadRequestException, NotFoundException,UnauthorizedException } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';
import { ParkingAvenueType } from '@prisma/client';
import { GetByApprovalStatus } from './dto/get-by-approval-status.dto';
import { UpdateApprovalStatus } from './dto/update-approval-status.dto';
import { UpdateVerificationDto } from './dto/update-verification-dto';

@Injectable()
export class AdminService {
  
    constructor( private readonly db: DatabaseService, private readonly jwtService: JwtService,) {}

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

    async parkingAvenueOwnerStatus(getByApprovalStatus: GetByApprovalStatus, adminId: string) {

      const isAdmin = await this.db.admin.findUnique({
        where: {
          id: adminId
        }
      });

      if(!isAdmin){
        throw new UnauthorizedException("Only admin is allowed to view approval status")
      }

      const unverifiedOwnersList = await this.db.parkingAvenueOwner.findMany({
        where: {
          isVerified: getByApprovalStatus.approvalStatus
        }
      });

      return unverifiedOwnersList;

    }

    async updateVerificationStatus(updateVerificationDto: UpdateVerificationDto, adminId: string){
      
      const isAdmin = await this.db.admin.findUnique({
        where: {
          id: adminId
        }
      });

      if(!isAdmin){
        throw new UnauthorizedException("Only admin can see list of unverified users.")
      }
      

      const updateStatus = await this.db.parkingAvenueOwner.update({
        where: {
          username: updateVerificationDto.username,
        },
        data: {
          isVerified: updateVerificationDto.approvalStatus
        }
      });

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


  async getByApprovalStatus(getByApprovalStatus: GetByApprovalStatus, adminId: string){

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
        where: {
          approvalStatus: getByApprovalStatus.approvalStatus
        }
      }
    );

    return parkingAvenuesByStatus;

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
      throw new NotFoundException("Only admin is allowed to view approval status")
    }

    const checkParkingAvenue = await this.db.parkingAvenue.findUnique(
      {
        where: {
          id: updateApprovalStatus.id
        }
      }
    );

    if(!checkParkingAvenue){
      throw new NotFoundException('Parking avenue with this id does not exist')
    }

    const updateStatus = await this.db.parkingAvenue.update(
      {
        where: {
          id: updateApprovalStatus.id
        },
        data: {
          approvalStatus: updateApprovalStatus.approvalStatus
        }
      }
    );

    return updateStatus
  }
}
