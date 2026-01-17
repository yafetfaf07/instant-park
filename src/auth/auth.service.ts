import { 
    Injectable,
    BadRequestException,
    ConflictException,
    UnauthorizedException,
    NotFoundException,
 } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';


@Injectable()
export class AuthService {

    constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.password.length || dto.password.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const gender = dto.gender;

    const existingUser = await this.db.customer.findFirst({
      where:{ 
        OR: [
          { phoneNo: dto.phoneNo },
          { username: dto.username }

      ]
    }
    });

    if (existingUser) {
      if (existingUser.phoneNo === dto.phoneNo) {
        throw new ConflictException('This phone number is already registered.');
      }
      if (existingUser.username === dto.username) {
        throw new ConflictException('This username is already taken.');
      }
    }

    const registeredUser = await this.db.customer.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        username: dto.username,
        phoneNo: dto.phoneNo,
        location: dto.location,
        password: hashedPassword,
        gender: gender,
      },
    });

    return {
      user: {
        phoneNo: registeredUser.phoneNo,
        firstName: registeredUser.firstName,
        username: registeredUser.username,
        lastName: registeredUser.lastName,
        location: registeredUser.location,
        gender: registeredUser.gender,
      },
      message: 'Registration successful',
    };
  }

    async login(dto: LoginDto) {

        if (!dto.phoneNo) {
        throw new BadRequestException('Enter phone number to login');
        }
        if (!dto.password) {
        throw new BadRequestException('Password is required');
        }

        const user = await this.db.customer.findUnique({ where: { phoneNo: dto.phoneNo! } });

        if (dto.phoneNo && !user) {
        throw new NotFoundException('Invalid phone number credentials');
        }

        const isPasswordMatch = await bcrypt.compare(dto.password, user!.password);

        if (!isPasswordMatch) {
        throw new UnauthorizedException('Invalid password credentials');
        }

        await this.db.customer.update({
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
    const user = await this.db.customer.findUnique({
      where: { id },
      select: {
        phoneNo: true,
        firstName: true,
        username: true,
        lastName: true,
        location: true,
        gender: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }


}
