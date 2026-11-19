import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';

@Injectable()
export class ZonesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByEvent(eventId: number) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('El evento no existe');
    }

    return this.prisma.zone.findMany({
      where: { eventId },
      orderBy: { name: 'asc' },
    });
  }

  async create(eventId: number, createZoneDto: CreateZoneDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        configuration: true,
        zones: true,
      },
    });

    if (!event) {
      throw new NotFoundException('El evento no existe');
    }

    if (!event.configuration?.usesZones) {
      throw new BadRequestException(
        'Este evento no está configurado para utilizar zonas',
      );
    }

    const totalZoneCapacity = event.zones.reduce(
      (total, zone) => total + zone.capacity,
      0,
    );

    if (
      totalZoneCapacity + createZoneDto.capacity >
      event.capacity
    ) {
      throw new BadRequestException(
        'La capacidad total de las zonas no puede superar la capacidad del evento',
      );
    }

    return this.prisma.zone.create({
      data: {
        name: createZoneDto.name,
        capacity: createZoneDto.capacity,
        description: createZoneDto.description,
        eventId,
      },
    });
  }

  async update(id: number, updateZoneDto: UpdateZoneDto) {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: {
        event: {
          include: {
            configuration: true,
            zones: true,
          },
        },
        ticketTypes: {
          where: {
            deletedAt: null,
          },
          select: {
            quantity: true,
          },
        },
      },
    });

    if (!zone) {
      throw new NotFoundException('La zona no existe');
    }

    if (!zone.event.configuration?.usesZones) {
      throw new BadRequestException(
        'Este evento no está configurado para utilizar zonas',
      );
    }

    if (updateZoneDto.capacity !== undefined) {
      const otherZonesCapacity = zone.event.zones
        .filter((item) => item.id !== zone.id)
        .reduce(
          (total, item) => total + item.capacity,
          0,
        );

      if (
        otherZonesCapacity + updateZoneDto.capacity >
        zone.event.capacity
      ) {
        throw new BadRequestException(
          'La capacidad total de las zonas no puede superar la capacidad del evento',
        );
      }

      const maxTicketTypeQuantity =
        zone.ticketTypes.length > 0
          ? Math.max(
              ...zone.ticketTypes.map(
                (ticketType) => ticketType.quantity,
              ),
            )
          : 0;

      if (updateZoneDto.capacity < maxTicketTypeQuantity) {
        throw new BadRequestException(
          'La capacidad de la zona no puede ser menor que la cantidad configurada en uno de sus tipos de entrada',
        );
      }
    }

    return this.prisma.zone.update({
      where: { id },
      data: {
        name: updateZoneDto.name,
        capacity: updateZoneDto.capacity,
        description: updateZoneDto.description,
      },
    });
  }

  async remove(id: number) {
    const zone = await this.prisma.zone.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            seats: true,
            ticketTypes: true,
          },
        },
      },
    });

    if (!zone) {
      throw new NotFoundException('La zona no existe');
    }

    if (
      zone._count.seats > 0 ||
      zone._count.ticketTypes > 0
    ) {
      throw new BadRequestException(
        'No se puede eliminar una zona que tiene asientos o tipos de entrada asociados',
      );
    }

    await this.prisma.zone.delete({
      where: { id },
    });

    return {
      message: 'Zona eliminada correctamente',
    };
  }
}