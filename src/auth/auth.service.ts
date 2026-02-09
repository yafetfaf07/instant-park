import { 
    Injectable,
    BadRequestException,
    ConflictException,
    UnauthorizedException,
    NotFoundException,
    InternalServerErrorException,
 } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';


@Injectable()
export class AuthService {

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
    private configService: ConfigService
  ) {}

  async sendOtp(phoneNumber: string){

    const url = 'https://api.afromessage.com/api/challenge';

    const config = {
        headers: {
          'Authorization': "Bearer " + this.configService.get<string>('AFRO_TOKEN')
,
          'Content-Type': 'application/json',
        },
        params: {
          from:'',
          to: phoneNumber,
          pr: "This is a one time password please don't share it to any one", 
          ps: "Thank you", 
          sb: 3,
          sa: 3,
          ttl: 300,
          len: 4,
          t: 0,
        },
      };

      try {
        const response = await firstValueFrom(this.httpService.get(url, config));
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
  }

  async verifyOtp(dto: {otp: string}){
    
    const tempUser = await this.db.temp.findUnique({
      where: {
        code: dto.otp
      },
      
    })
    if (tempUser){


      const url = 'https://api.afromessage.com/api/verify';

      const config = {
          headers: {
              'Authorization': "Bearer " + this.configService.get<string>('AFRO_TOKEN'),
              'Content-Type': 'application/json',
            },
            params: {
              to: tempUser?.phoneNo,
              code: dto.otp
            },
          };

          try {
            const response = await firstValueFrom(this.httpService.get(url, config));
            const acknowledge = response.data.acknowledge

            if (acknowledge == "success"){
              const user = await this.db.customer.create({
                data: {
                  firstName: tempUser?.firstName,
                  lastName: tempUser.lastName,
                  username: tempUser.username,
                  phoneNo: tempUser.phoneNo,
                  gender: tempUser.gender,
                  location: tempUser.location,
                  
                }
              })

              if (user){
                const deleteTemp = await this.db.temp.delete({
                  where: {
                     code: dto.otp
                  }
                })

                const payload = {
                        sub: user!.id,
                    };
                  const accessToken = this.jwtService.sign(payload);
                    return { accessToken };

                }
              }
            }
          
          catch (error) {
            throw error.response?.data || error.message;
        }
  }
    

  }
  

  async register(dto: RegisterDto) {
 
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

    const result = await this.sendOtp(dto.phoneNo);

    const acknowledge = result.acknowledge;
    const verificationId = result.response.verificationId;
    const code  = result.response.code;

    if (acknowledge == 'success')
      {
        const registeredUser = await this.db.temp.create({
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            username: dto.username,
            phoneNo: dto.phoneNo,
            location: dto.location,
            gender: gender,
            verificationId: verificationId,
            code: code
          },
        });

        return {
          temp: {
            phoneNo: registeredUser.phoneNo,
            firstName: registeredUser.firstName,
            username: registeredUser.username,
            lastName: registeredUser.lastName,
            location: registeredUser.location,
            gender: registeredUser.gender,
          },
          message: 'Temp account created verify your account with otp you recieved',
        }
      }
    else {
      throw new InternalServerErrorException()
    }

  }

    async loginSendOtp(dto: LoginDto) {

      if (!dto.phoneNo) {
        throw new BadRequestException('Enter phone number to login');
      }
        
        
      const user = await this.db.customer.findUnique({ where: { phoneNo: dto.phoneNo! } });

      if (dto.phoneNo && !user) {
        throw new NotFoundException('Invalid phone number credentials');
      }

      const result = await this.sendOtp(dto.phoneNo)
      const acknowledge = result.acknowledge
      console.log(result)
      if(acknowledge == 'success'){
        return {response: "OTP sent successfully"}
      }

  }


    async loginVerifyOtp(dto: {phoneNo: string, otp: string}) {

      if (!dto.phoneNo) {
        throw new BadRequestException('Enter phone number to login');
      }
        
        
      const user = await this.db.customer.findUnique({ where: { phoneNo: dto.phoneNo! } });

      if (dto.phoneNo && !user) {
        throw new NotFoundException('Invalid phone number credentials');
      }

      const url = 'https://api.afromessage.com/api/verify';

      const config = {
          headers: {
              'Authorization': "Bearer " + this.configService.get<string>('AFRO_TOKEN'),
              'Content-Type': 'application/json',
            },
            params: {
              to: dto.phoneNo,
              code: dto.otp
            },
          };

          try {
                const response = await firstValueFrom(this.httpService.get(url, config));
                const acknowledge = response.data.acknowledge
                 
                if(acknowledge == "success"){
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
          } catch (error) {
                throw error.response?.data || error.message;
          }


      
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
