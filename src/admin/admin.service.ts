import { Injectable, ConflictException, BadRequestException, NotFoundException,UnauthorizedException } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';

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

    async unverifiedParkingAvenueOwners(userId: string) {

      const isAdmin = await this.db.admin.findUnique({
        where: {
          id: userId
        }
      });

      if(!isAdmin){
        throw new UnauthorizedException("Only admin can see list of unverified users.")
      }

      const unverifiedOwnersList = await this.db.parkingAvenueOwner.findMany({
        where: {
          isVerified: false
        },
        select: {
          username: true,
          isVerified: true,
        }
      });

      return unverifiedOwnersList;

    }

    async updateVerificationStatus(verificationdto: {username: string, verificationUpdate: boolean}, userId: string){
      
      const isAdmin = await this.db.admin.findUnique({
        where: {
          id: userId
        }
      });

      if(!isAdmin){
        throw new UnauthorizedException("Only admin can see list of unverified users.")
      }
      
      const username = verificationdto.username
      const verificationUpdate = verificationdto.verificationUpdate

      const updateStatus = await this.db.parkingAvenueOwner.update({
        where: {
          username,
        },
        data: {
          isVerified: verificationUpdate
        }
      });

      return updateStatus
      
    }

}
