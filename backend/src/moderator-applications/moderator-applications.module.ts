import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ModeratorApplicationsController } from './moderator-applications.controller';
import { ModeratorApplicationsService } from './moderator-applications.service';

@Module({
  imports: [PrismaModule],
  controllers: [ModeratorApplicationsController],
  providers: [ModeratorApplicationsService],
})
export class ModeratorApplicationsModule {}