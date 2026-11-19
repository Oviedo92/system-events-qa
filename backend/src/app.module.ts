import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EventsModule } from './events/events.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { EventTemplatesModule } from './event-templates/event-templates.module';
import { ZonesModule } from './zones/zones.module';
import { SeatsModule } from './seats/seats.module';
import { TicketTypesModule } from './ticket-types/ticket-types.module';
import { ProductsModule } from './products/products.module';
import { ProductCategoriesModule } from './product-categories/product-categories.module';
import { ProductVariantsModule } from './product-variants/product-variants.module';
import { ProductImagesModule } from './product-images/product-images.module';
import { PromotionsModule } from './promotions/promotions.module';
import { CartsModule } from './carts/carts.module';
import { ReservationsModule } from './reservations/reservations.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { TicketsModule } from './tickets/tickets.module';
import { ProductOptionsModule } from './product-options/product-options.module';
import { EventAvailabilityModule } from './event-availability/event-availability.module';
import { PromoterApplicationsModule } from './promoter-applications/promoter-applications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    EventsModule,
    AuthModule,
    PrismaModule,
    UsersModule,
    EventTemplatesModule,
    ZonesModule,
    SeatsModule,
    TicketTypesModule,
    ProductsModule,
    ProductCategoriesModule,
    ProductVariantsModule,
    ProductImagesModule,
    PromotionsModule,
    CartsModule,
    ReservationsModule,
    OrdersModule,
    PaymentsModule,
    TicketsModule,
    ProductOptionsModule,
    EventAvailabilityModule,
    PromoterApplicationsModule,
  ],
})
export class AppModule {}