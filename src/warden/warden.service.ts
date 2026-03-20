import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateWardenDto } from './dto/create-warden.dto';
import { UpdateWardenDto } from './dto/update-warden.dto';
import { DatabaseService } from '../database/database.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from 'src/auth/dto/login.dto';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { LoginVerifyDto } from 'src/auth/dto/loginVerify.dto';
import { GetUsernameWardenDto } from './dto/get-username-warden.dto';
import { GetPhoneNoWardenDto } from './dto/get-phoneno-warden.dto';


@Injectable()
export class WardenService {
  
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly httpService: HttpService,
    private configService: ConfigService 
  ) { }
  
  async create(createWardenDto: CreateWardenDto, parkingAvenueOwnerId: string) {
    
    
    const parkingAvenueOwnerCheck = await this.databaseService.parkingAvenueOwner.findUnique({
      where: { id: parkingAvenueOwnerId },
    });
    
    if (!parkingAvenueOwnerCheck) {
          throw new NotFoundException(
            'Only parking avenue owners can register warden',
          );
    }

    if (!parkingAvenueOwnerCheck.isVerified) {
          throw new BadRequestException("Only Verified parking avenue owners can register parking avenues")
    }

    const existingWarden = await this.databaseService.warden.findFirst(
      {
        where: {
          OR: [
             { phoneNo: createWardenDto.phoneNo },
             { username: createWardenDto.username }
          ]
        }
      }
    );

    if (existingWarden) {
      if (existingWarden.phoneNo === createWardenDto.phoneNo) {
        throw new ConflictException('This phone number is already registered.');
      }
      if (existingWarden.username === createWardenDto.username) {
        throw new ConflictException('This username is already taken.');
      }
    }
    
    const warden= await this.databaseService.warden.create({
      data: { ...createWardenDto },
    });
  
    if(warden){

      const payload = {
        sub: warden!.id,
      };
      const accessToken = this.jwtService.sign(payload);

      return { accessToken };
    }
    else {
      throw new InternalServerErrorException("Sorry an internal error occured")
    }
   
  }

  async sendOtp(phoneNumber: string){
    

    const url = 'https://api.afromessage.com/api/challenge';

    const config = {
        headers: {
          'Authorization': "Bearer " + this.configService.get<string>('AFRO_TOKEN'),
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

    try{

      const response = await firstValueFrom(this.httpService.get(url, config));
      return response.data;
      
    } catch (error){
      throw error.response?.data || error.message;
    }
  }

  async loginVerifyOtp(dto: LoginVerifyDto){

    if(!dto.phoneNo){
      throw new BadRequestException('Enter phone number to login');
    }

    const warden = await this.databaseService.warden.findUnique(
      {
        where: {
          phoneNo: dto.phoneNo!
        }
      }
    );

    if(dto.phoneNo && !warden){
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

      try{
        const response = await firstValueFrom(this.httpService.get(url, config));
        const acknowledge = response.data.acknowledge;

        if(acknowledge == "success"){
          await this.databaseService.warden.update({
            where: {
              id: warden!.id,
            },
            data: {
              lastLogin: new Date(),
            },
          });

          const payload = {
            sub: warden!.id,
          };

          const accessToken = this.jwtService.sign(payload);
          return { accessToken };
        }
        return (response.data.errors?.[0] || 'Invalid or expired OTP');
      }
      catch(error){
          throw error.response?.data || error.message;

      }
        

      
  }

  async loginSendOtp(dto: LoginDto){
   
    if(!dto.phoneNo){
      throw new BadRequestException('Enter phone number to login');
    }

    const warden = await this.databaseService.warden.findUnique(
      {
        where: {
          phoneNo: dto.phoneNo!
        }
      }
    );

    if(dto.phoneNo && !warden){
        throw new NotFoundException('Invalid phone number credentials');
    }

    const result = await this.sendOtp(dto.phoneNo);
    const acknowledge = result.acknowledge;
    
    if(acknowledge == 'success'){
        return {response: "OTP sent successfully"}
    }

  }


  async findAll(parkingAvenueId: string, parkingAvenueOwnerId: string) {

    
    const parkingAvenueOwnerCheck = await this.databaseService.parkingAvenueOwner.findUnique({
      where: { id: parkingAvenueOwnerId },
    });
    
    if (!parkingAvenueOwnerCheck) {
          throw new NotFoundException(
            'Only parking avenue owners can view wardens list',
          );
    }

    const checkParkingAvenueId = await this.databaseService.parkingAvenue.findMany({
      where: {
        ownerId: parkingAvenueId
      },

    });

    if(!checkParkingAvenueId){
      throw new NotFoundException("Cannot find this parking avenue");
    }

    const wardens = await this.databaseService.warden.findMany(
      {
        where: {
          parkingAvenueId: parkingAvenueId
        }
      }
    );

    if(!wardens){
      throw new NotFoundException("No wardens exist in this parking aveneue")
    }

    return wardens;

  }

  async getWardenDetail(wardenId: string, parkingAvenueOwnerId: string) {

    const parkingAvenueOwnerCheck = await this.databaseService.parkingAvenueOwner.findUnique({
      where: { id: parkingAvenueOwnerId },
    });
    
    if (!parkingAvenueOwnerCheck) {
          throw new NotFoundException(
            'Only parking avenue owners can view warden account',
          );
    }

    const warden = await this.databaseService.warden.findUnique(
      {
        where:{
            id: wardenId
        }
      }
    );

    if(!warden){
      throw new NotFoundException("Warden account does not exist");
    }

    return warden;

  }

  async getWardenByUserName(getUsernameWardenDto: GetUsernameWardenDto, parkingAvenueOwnerId: string){

    const parkingAvenueOwnerCheck = await this.databaseService.parkingAvenueOwner.findUnique({
      where: { id: parkingAvenueOwnerId },
    });
    
    if (!parkingAvenueOwnerCheck) {
          throw new NotFoundException(
            'Only parking avenue owners can serch warden account',
          );
    }

    const warden = await this.databaseService.warden.findUnique(
      {
        where: {
          username: getUsernameWardenDto.username
        }
      }
    );

    if(!warden){
      throw new NotFoundException("Warden with this username does not exist");
    }
    return warden;

  }

  async getWardenByPhoneNo(getPhoneNoWardenDto: GetPhoneNoWardenDto, parkingAvenueOwnerId: string){
    
    const parkingAvenueOwnerCheck = await this.databaseService.parkingAvenueOwner.findUnique({
      where: { id: parkingAvenueOwnerId },
    });
    
    if (!parkingAvenueOwnerCheck) {
          throw new NotFoundException(
            'Only parking avenue owners can serch warden account',
          );
    }

    const warden = await this.databaseService.warden.findUnique(
      {
        where: {
          phoneNo: getPhoneNoWardenDto.phoneNo
        }
      }
    );

    if(!warden){
      throw new NotFoundException("Warden with this phoneNO does not exist");
    }
    return warden;

  }

  async update(wardenId: string, updateWardenDto: UpdateWardenDto, parkingAvenueOwnerId: string) {

    const parkingAvenueOwnerCheck = await this.databaseService.parkingAvenueOwner.findUnique({
      where: { id: parkingAvenueOwnerId },
    });
    
    if (!parkingAvenueOwnerCheck) {
          throw new NotFoundException(
            'Only parking avenue owners can update warden account',
          );
    }

    const warden = await this.databaseService.warden.findUnique(
    {
      where:{
          id: wardenId
      }
    }
    );

    if(!warden){
      throw new NotFoundException("Warden account does not exist");
    }

    return this.databaseService.warden.update(
      {
        where: {
          id: wardenId
        },
        data: updateWardenDto,
      }
    );


  }

  async remove(wardenId: string, parkingAvenueOwnerId: string) {

    const parkingAvenueOwnerCheck = await this.databaseService.parkingAvenueOwner.findUnique({
      where: { id: parkingAvenueOwnerId },
    });
    
    if (!parkingAvenueOwnerCheck) {
          throw new NotFoundException(
            'Only parking avenue owners can delete warden account',
          );
    }

    const warden = await this.databaseService.warden.findUnique(
      {
        where:{
          id: wardenId
        }
      }
    );

    if(!warden){
      throw new NotFoundException("Warden account does not exist");
    }

    const deletedWarden = await this.databaseService.warden.delete({
      where: {
        id: wardenId
      }
    });


    
  }

  async getProfile(wardenId: string) {

    const warden = await this.databaseService.warden.findUnique(
      {
        where: {
          id: wardenId
        }
      }
    );

    if(!warden){
      throw new NotFoundException("Warden not found");
    }

    return warden;

  }

}
