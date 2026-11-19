import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { EventAvailabilityGateway } from './event-availability.gateway';
import { EventAvailabilityService } from './event-availability.service';

@Module({
  imports: [PrismaModule],
  providers: [
    EventAvailabilityService,
    EventAvailabilityGateway,
  ],
  exports: [EventAvailabilityService],
})
export class EventAvailabilityModule {}