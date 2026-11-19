import { Module } from '@nestjs/common';

import { EventTemplatesController } from './event-templates.controller';
import { EventTemplatesService } from './event-templates.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EventTemplatesController],
  providers: [EventTemplatesService],
})
export class EventTemplatesModule {}