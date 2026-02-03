import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class VehicleService {

  constructor(private readonly databaseService: DatabaseService) {}
  

  async create(createVehicleDto: CreateVehicleDto, userid: string) {
    
    const user = await this.databaseService.customer.findUnique({
      where: {
        id: userid
      }
    });

    if(!user){
      throw new NotFoundException("This Customer account doesn't exist")
    };

    const addVehicle = await this.databaseService.vehicle.create(
      {
        data: {
          ...createVehicleDto,
          ownerId: userid
        }
      }
    );

    return addVehicle;    
  }

  findAll(userid: string) {
    return this.databaseService.vehicle.findMany(
      {
        where: {
          ownerId: userid
        }
      }
    );
  }

  async findOne(license: string, userid: string) {
    const vehicle = await this.databaseService.vehicle.findUnique(
      {
        where: {
          ownerId_licensePlate: {
            ownerId: userid,
            licensePlate: license
          }
        }
      }
    );

    if(!vehicle){
      throw new NotFoundException("This vehicle doesn't exist")
    };

    return vehicle
  }

  async remove(license: string, userid: string) {
    
    const vehicle = await this.databaseService.vehicle.findUnique(
      {
        where: {
          ownerId_licensePlate: {
            ownerId: userid,
            licensePlate: license
          }
        }
      }
    );
    
    if(!vehicle){
      throw new NotFoundException("This vehicle doesn't exist")
    };

    const deleteVehicle = await this.databaseService.vehicle.delete({
      where: {
        ownerId_licensePlate: {
            ownerId: userid,
            licensePlate: license
          }
      }
    });

    
  }
}
