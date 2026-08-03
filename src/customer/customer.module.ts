import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  controllers: [CustomerController],
  providers: [CustomerService],
  imports: [ DatabaseModule],
})
export class CustomerModule {}
