import { Injectable, BadRequestException, ConflictException, UnauthorizedException, NotFoundException, Logger } from '@nestjs/common';
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

@Injectable()
export class ParkingAvenueOwnerService {
  private readonly logger = new Logger(ParkingAvenueOwnerService.name); 
  constructor( 
    private readonly db: DatabaseService, 
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2,
    private readonly  emailService: EmailService,
  ) {}
  
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
  
  async forgotPassword(parkingAvenueOwnerId: string) {
    const user = await this.db.parkingAvenueOwner.findUnique({ where: { id : parkingAvenueOwnerId } });
    if (!user) throw new NotFoundException('User not found');

    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 15 * 60000);

    await this.db.parkingAvenueOwner.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });
    
    try {
      await this.emailService.sendForgotPasswordEmail(user.email, user.firstName, token);
      return "Sent email successfully."
    }
    catch(error){
        console.error("Failed to send email", error);
    }

  }

  async resetPassword(parkingAvenueOwnerId: string, token: string, newPassword: string) {
    const user = await this.db.parkingAvenueOwner.findUnique({ where: { id : parkingAvenueOwnerId } });
    
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
}
