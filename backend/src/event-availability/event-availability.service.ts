import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { EventAvailabilityGateway } from './event-availability.gateway';

export interface EventAvailability {
  eventId: number;
  capacity: number;
  soldTickets: number;
  reservedTickets: number;
  availableTickets: number;
  occupancyPercentage: number;
  salesStatus: 'ON_SALE' | 'SOLD_OUT';
  zones: [];
}

@Injectable()
export class EventAvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: EventAvailabilityGateway,
  ) {}

  async getAvailability(eventId: number): Promise<EventAvailability> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        configuration: true,
        ticketTypes: {
          where: {
            deletedAt: null,
            status: 'ACTIVE',
          },
          select: {
            quantity: true,
            available: true,
          },
        },
        seats: {
          select: {
            id: true,
            status: true,
          },
        },
        tickets: {
          select: {
            seatId: true,
            ticketTypeId: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`No existe el evento ${eventId}`);
    }

    const usesSeats = event.configuration?.usesSeats ?? false;

    let soldTickets: number;
    let reservedTickets: number;
    let availableTickets: number;

    if (usesSeats) {
      const soldSeatIds = new Set(
        event.tickets
          .filter((ticket) => ticket.seatId !== null)
          .map((ticket) => ticket.seatId),
      );

      soldTickets = soldSeatIds.size;

      reservedTickets = event.seats.filter(
        (seat) =>
          seat.status === 'RESERVED' &&
          !soldSeatIds.has(seat.id),
      ).length;

      availableTickets = event.seats.filter(
        (seat) => seat.status === 'AVAILABLE',
      ).length;
    } else {
      const committedTickets = event.ticketTypes.reduce(
        (total, type) => total + type.quantity - type.available,
        0,
      );

      soldTickets = event.tickets.filter(
        (ticket) => ticket.ticketTypeId !== null,
      ).length;

      reservedTickets = Math.max(0, committedTickets - soldTickets);

      availableTickets = event.ticketTypes.reduce(
        (total, type) => total + type.available,
        0,
      );
    }

    const capacity = event.capacity;

    const occupancyPercentage =
      capacity > 0
        ? Math.min(
            100,
            Math.round(
              ((soldTickets + reservedTickets) / capacity) * 100,
            ),
          )
        : 0;

    return {
      eventId: event.id,
      capacity,
      soldTickets,
      reservedTickets,
      availableTickets,
      occupancyPercentage,
      salesStatus: availableTickets > 0 ? 'ON_SALE' : 'SOLD_OUT',
      zones: [],
    };
  }

  async publishAvailability(eventId: number): Promise<void> {
    const availability = await this.getAvailability(eventId);
    this.gateway.emitAvailability(availability);
  }
}