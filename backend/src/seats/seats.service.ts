import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeatDto } from './dto/create-seat.dto';
import { UpdateSeatDto } from './dto/update-seat.dto';

@Injectable()
export class SeatsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByEvent(eventId: number) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('El evento no existe');
    }

    return this.prisma.seat.findMany({
      where: { eventId },
      include: {
        zone: true,
      },
      orderBy: [
        { row: 'asc' },
        { number: 'asc' },
      ],
    });
  }

  async create(
    eventId: number,
    createSeatDto: CreateSeatDto,
  ) {
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

    if (!event.configuration?.usesSeats) {
      throw new BadRequestException(
        'Este evento no está configurado para utilizar asientos',
      );
    }

    const seatCount = await this.prisma.seat.count({
      where: { eventId },
    });

    if (seatCount >= event.capacity) {
      throw new BadRequestException(
        'No se pueden crear más asientos porque se alcanzó la capacidad del evento',
      );
    }

    let zoneCapacity: number | null = null;

    if (createSeatDto.zoneId !== undefined) {
      if (!event.configuration.usesZones) {
        throw new BadRequestException(
          'Este evento no está configurado para utilizar zonas',
        );
      }

      const zone = await this.prisma.zone.findUnique({
        where: { id: createSeatDto.zoneId },
      });

      if (!zone) {
        throw new NotFoundException('La zona no existe');
      }

      if (zone.eventId !== eventId) {
        throw new BadRequestException(
          'La zona no pertenece a este evento',
        );
      }

      zoneCapacity = zone.capacity;

      const zoneSeatCount = await this.prisma.seat.count({
        where: {
          eventId,
          zoneId: createSeatDto.zoneId,
        },
      });

      if (zoneSeatCount >= zoneCapacity) {
        throw new BadRequestException(
          'No se pueden crear más asientos porque se alcanzó la capacidad de la zona',
        );
      }
    }

    try {
      return await this.prisma.seat.create({
        data: {
          row: createSeatDto.row,
          number: createSeatDto.number,
          eventId,
          zoneId: createSeatDto.zoneId,
        },
        include: {
          zone: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `El asiento ${createSeatDto.row}${createSeatDto.number} ya existe para este evento`,
        );
      }

      throw error;
    }
  }

  async update(
    id: number,
    updateSeatDto: UpdateSeatDto,
  ) {
    const seat = await this.prisma.seat.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            reservationItems: true,
            orderItems: true,
            tickets: true,
          },
        },
      },
    });

    if (!seat) {
      throw new NotFoundException('El asiento no existe');
    }

    const changesIdentity =
      updateSeatDto.row !== undefined ||
      updateSeatDto.number !== undefined ||
      updateSeatDto.zoneId !== undefined;

    const hasReferences =
      seat._count.reservationItems > 0 ||
      seat._count.orderItems > 0 ||
      seat._count.tickets > 0;

    if (changesIdentity && hasReferences) {
      throw new BadRequestException(
        'No se puede modificar un asiento que ya tiene reservas, órdenes o tickets asociados',
      );
    }

    if (updateSeatDto.zoneId !== undefined) {
      const event = await this.prisma.event.findUnique({
        where: { id: seat.eventId },
        include: {
          configuration: true,
        },
      });

      if (!event) {
        throw new NotFoundException('El evento no existe');
      }

      if (!event.configuration?.usesSeats) {
        throw new BadRequestException(
          'Este evento no está configurado para utilizar asientos',
        );
      }

      if (!event.configuration.usesZones) {
        throw new BadRequestException(
          'Este evento no está configurado para utilizar zonas',
        );
      }

      const zone = await this.prisma.zone.findUnique({
        where: { id: updateSeatDto.zoneId },
      });

      if (!zone) {
        throw new NotFoundException('La zona no existe');
      }

      if (zone.eventId !== seat.eventId) {
        throw new BadRequestException(
          'La zona no pertenece al mismo evento del asiento',
        );
      }

      const zoneSeatCount = await this.prisma.seat.count({
        where: {
          eventId: seat.eventId,
          zoneId: updateSeatDto.zoneId,
          id: { not: id },
        },
      });

      if (zoneSeatCount >= zone.capacity) {
        throw new BadRequestException(
          'No se puede asignar el asiento porque la zona ya alcanzó su capacidad',
        );
      }
    }

    try {
      return await this.prisma.seat.update({
        where: { id },
        data: {
          row: updateSeatDto.row,
          number: updateSeatDto.number,
          zoneId: updateSeatDto.zoneId,
        },
        include: {
          zone: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe otro asiento con esa fila y número en este evento',
        );
      }

      throw error;
    }
  }

  async remove(id: number) {
    const seat = await this.prisma.seat.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            reservationItems: true,
            orderItems: true,
            tickets: true,
          },
        },
      },
    });

    if (!seat) {
      throw new NotFoundException('El asiento no existe');
    }

    if (
      seat._count.reservationItems > 0 ||
      seat._count.orderItems > 0 ||
      seat._count.tickets > 0
    ) {
      throw new BadRequestException(
        'No se puede eliminar un asiento que tiene reservas, órdenes o tickets asociados',
      );
    }

    await this.prisma.seat.delete({
      where: { id },
    });

    return {
      message: 'Asiento eliminado correctamente',
    };
  }
}