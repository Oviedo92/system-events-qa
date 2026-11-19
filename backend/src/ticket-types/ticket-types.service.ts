import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';

@Injectable()
export class TicketTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByEvent(eventId: number) {
    const event = await this.prisma.event.findUnique({
      where: {
        id: eventId,
      },
    });

    if (!event) {
      throw new NotFoundException('El evento no existe');
    }

    return this.prisma.ticketType.findMany({
      where: {
        eventId,
        deletedAt: null,
      },
      include: {
        zone: true,
      },
      orderBy: [
        {
          price: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });
  }

  async findOne(id: number) {
    const ticketType = await this.prisma.ticketType.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        zone: true,
        event: true,
      },
    });

    if (!ticketType) {
      throw new NotFoundException(
        'El tipo de entrada no existe',
      );
    }

    return ticketType;
  }

  async create(
    eventId: number,
    createTicketTypeDto: CreateTicketTypeDto,
  ) {
    const event = await this.prisma.event.findUnique({
      where: {
        id: eventId,
      },
      include: {
        configuration: true,
      },
    });

    if (!event) {
      throw new NotFoundException(
        'El evento no existe',
      );
    }

    const {
      name,
      description,
      price,
      quantity,
      zoneId,
      startSaleAt,
      endSaleAt,
    } = createTicketTypeDto;

    const startSaleDate = startSaleAt
      ? new Date(startSaleAt)
      : null;

    const endSaleDate = endSaleAt
      ? new Date(endSaleAt)
      : null;

    /*
     * ---------------------------------------------------------
     * VALIDACIÓN DE FECHAS DE VENTA
     * ---------------------------------------------------------
     */

    if (
      startSaleDate &&
      endSaleDate &&
      startSaleDate >= endSaleDate
    ) {
      throw new BadRequestException(
        'La fecha de inicio de venta debe ser anterior a la fecha de finalización',
      );
    }

    if (
      startSaleDate &&
      startSaleDate >= event.startAt
    ) {
      throw new BadRequestException(
        'La venta de entradas debe comenzar antes del inicio del evento',
      );
    }

    if (
      endSaleDate &&
      endSaleDate > event.startAt
    ) {
      throw new BadRequestException(
        'La venta de entradas debe finalizar antes del inicio del evento',
      );
    }

    /*
     * ---------------------------------------------------------
     * VALIDACIÓN DE ZONA
     * ---------------------------------------------------------
     */

    let zoneCapacity: number | null = null;

    if (zoneId !== undefined) {
      if (!event.configuration?.usesZones) {
        throw new BadRequestException(
          'El evento no utiliza zonas',
        );
      }

      const zone = await this.prisma.zone.findUnique({
        where: {
          id: zoneId,
        },
      });

      if (!zone) {
        throw new NotFoundException(
          'La zona no existe',
        );
      }

      if (zone.eventId !== eventId) {
        throw new BadRequestException(
          'La zona no pertenece al evento',
        );
      }

      zoneCapacity = zone.capacity;
    }

    /*
     * ---------------------------------------------------------
     * VALIDACIÓN DE CAPACIDAD
     * ---------------------------------------------------------
     *
     * Si el TicketType pertenece a una zona, su inventario
     * inicial no puede superar la capacidad de dicha zona.
     */

    if (
      zoneCapacity !== null &&
      quantity > zoneCapacity
    ) {
      throw new BadRequestException(
        'La cantidad de entradas no puede superar la capacidad de la zona',
      );
    }

    /*
     * Si el evento no utiliza zonas, el TicketType debe
     * representar inventario general del evento.
     */

    if (
      !event.configuration?.usesZones &&
      zoneId !== undefined
    ) {
      throw new BadRequestException(
        'No se puede asociar una zona a un evento que no utiliza zonas',
      );
    }

    /*
     * ---------------------------------------------------------
     * CREACIÓN
     * ---------------------------------------------------------
     */

    return this.prisma.ticketType.create({
      data: {
        name,
        description,
        price,
        quantity,
        available: quantity,
        currency: 'COP',
        eventId,
        zoneId,
        startSaleAt: startSaleDate,
        endSaleAt: endSaleDate,
        status: 'ACTIVE',
      },
      include: {
        zone: true,
      },
    });
  }

  async update(
    id: number,
    updateTicketTypeDto: UpdateTicketTypeDto,
  ) {
    const ticketType = await this.prisma.ticketType.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        event: {
          include: {
            configuration: true,
          },
        },
      },
    });

    if (!ticketType) {
      throw new NotFoundException(
        'El tipo de entrada no existe',
      );
    }

    const {
      name,
      description,
      price,
      quantity,
      zoneId,
      startSaleAt,
      endSaleAt,
    } = updateTicketTypeDto;

    /*
     * ---------------------------------------------------------
     * FECHAS DE VENTA
     * ---------------------------------------------------------
     */

    const newStartSaleAt =
      startSaleAt !== undefined
        ? new Date(startSaleAt)
        : ticketType.startSaleAt;

    const newEndSaleAt =
      endSaleAt !== undefined
        ? new Date(endSaleAt)
        : ticketType.endSaleAt;

    if (
      newStartSaleAt &&
      newEndSaleAt &&
      newStartSaleAt >= newEndSaleAt
    ) {
      throw new BadRequestException(
        'La fecha de inicio de venta debe ser anterior a la fecha de finalización',
      );
    }

    if (
      newStartSaleAt &&
      newStartSaleAt >= ticketType.event.startAt
    ) {
      throw new BadRequestException(
        'La venta de entradas debe comenzar antes del inicio del evento',
      );
    }

    if (
      newEndSaleAt &&
      newEndSaleAt > ticketType.event.startAt
    ) {
      throw new BadRequestException(
        'La venta de entradas debe finalizar antes del inicio del evento',
      );
    }

    /*
     * ---------------------------------------------------------
     * VALIDACIÓN DE INVENTARIO
     * ---------------------------------------------------------
     */

    const committed =
      ticketType.quantity - ticketType.available;

    const newQuantity =
      quantity !== undefined
        ? quantity
        : ticketType.quantity;

    if (newQuantity < committed) {
      throw new BadRequestException(
        `La cantidad no puede ser menor que las ${committed} entradas ya comprometidas`,
      );
    }

    const newAvailable =
      newQuantity - committed;

    /*
     * ---------------------------------------------------------
     * VALIDACIÓN DE ZONA
     * ---------------------------------------------------------
     */

    let newZoneId = ticketType.zoneId;

    if (zoneId !== undefined) {
      if (!ticketType.event.configuration?.usesZones) {
        throw new BadRequestException(
          'El evento no utiliza zonas',
        );
      }

      const zone = await this.prisma.zone.findUnique({
        where: {
          id: zoneId,
        },
      });

      if (!zone) {
        throw new NotFoundException(
          'La zona no existe',
        );
      }

      if (zone.eventId !== ticketType.eventId) {
        throw new BadRequestException(
          'La zona no pertenece al evento',
        );
      }

      /*
       * No permitimos cambiar la zona de un TicketType
       * que ya tenga inventario comprometido.
       */

      if (
        ticketType.zoneId !== zoneId &&
        committed > 0
      ) {
        throw new BadRequestException(
          'No se puede cambiar la zona porque existen entradas comprometidas',
        );
      }

      if (newQuantity > zone.capacity) {
        throw new BadRequestException(
          'La cantidad de entradas no puede superar la capacidad de la zona',
        );
      }

      newZoneId = zoneId;
    }

    /*
     * Si no se especifica una zona en el update,
     * conservamos la existente.
     */

    if (
      newZoneId !== null &&
      newZoneId !== undefined
    ) {
      const zone = await this.prisma.zone.findUnique({
        where: {
          id: newZoneId,
        },
      });

      if (!zone) {
        throw new NotFoundException(
          'La zona asociada al tipo de entrada no existe',
        );
      }

      if (newQuantity > zone.capacity) {
        throw new BadRequestException(
          'La cantidad de entradas no puede superar la capacidad de la zona',
        );
      }
    }

    /*
     * ---------------------------------------------------------
     * UPDATE
     * ---------------------------------------------------------
     */

    return this.prisma.ticketType.update({
      where: {
        id,
      },

      data: {
        name,
        description,
        price,

        quantity: newQuantity,
        available: newAvailable,

        zoneId: newZoneId,

        startSaleAt: newStartSaleAt,
        endSaleAt: newEndSaleAt,
      },

      include: {
        zone: true,
      },
    });
  }

  async remove(id: number) {
    const ticketType = await this.prisma.ticketType.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!ticketType) {
      throw new NotFoundException(
        'El tipo de entrada no existe',
      );
    }

    return this.prisma.ticketType.update({
      where: {
        id,
      },

      data: {
        deletedAt: new Date(),
        status: 'INACTIVE',
      },

      include: {
        zone: true,
      },
    });
  }
}