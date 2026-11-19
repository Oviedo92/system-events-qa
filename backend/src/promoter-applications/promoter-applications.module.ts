import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { PromoterApplicationsController } from './promoter-applications.controller';
import { PromoterApplicationsService } from './promoter-applications.service';

@Module({
  imports: [PrismaModule],
  controllers: [PromoterApplicationsController],
  providers: [PromoterApplicationsService],
})
export class PromoterApplicationsModule {}