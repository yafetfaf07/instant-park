import { Injectable, BadRequestException, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { CreateParkingAvenueOwnerDto } from './dto/create-parking-avenue-owner.dto';
import { UpdateParkingAvenueOwnerDto } from './dto/update-parking-avenue-owner.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ParkingAvenueOwnerService {
 
  constructor( private readonly db: DatabaseService, private readonly jwtService: JwtService,) {}
  
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
  
}
