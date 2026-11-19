import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { CartsModule } from '../carts/carts.module';
import { EventAvailabilityModule } from '../event-availability/event-availability.module';

import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';

@Module({
  imports: [
    PrismaModule,
    CartsModule,
    EventAvailabilityModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
