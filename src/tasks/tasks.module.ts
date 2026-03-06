import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [TasksService]
})
export class TasksModule { }
