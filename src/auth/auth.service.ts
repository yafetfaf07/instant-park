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

    const existingUser = await this.db.user.findFirst({
      where: { phoneNo: dto.phoneNo },
    });

    if (existingUser) {
      throw new ConflictException('Phone number already in use');
    }

    const registeredUser = await this.db.user.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phoneNo: dto.phoneNo,
        location: dto.location,
        password: hashedPassword,
        gender: gender,
      },
    });

    return {
      user: {
        id: registeredUser.id,
        phoneNo: registeredUser.phoneNo,
        firstName: registeredUser.firstName,
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

        const user = await this.db.user.findUnique({ where: { phoneNo: dto.phoneNo! } });

        if (dto.phoneNo && !user) {
        throw new NotFoundException('Invalid phone number credentials');
        }

        const isPasswordMatch = await bcrypt.compare(dto.password, user!.password);

        if (!isPasswordMatch) {
        throw new UnauthorizedException('Invalid password credentials');
        }

        await this.db.user.update({
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

  async getProfile(id: number) {
    const user = await this.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        phoneNo: true,
        firstName: true,
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
