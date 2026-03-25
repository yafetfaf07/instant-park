import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { DatabaseModule } from 'src/database/database.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [DatabaseModule, SmsModule],
  providers: [TasksService]
})
export class TasksModule { }
