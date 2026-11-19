import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { EventAvailabilityModule } from '../event-availability/event-availability.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [
    PrismaModule,
    EventAvailabilityModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}