
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  Prisma,
  Ticket,
} from '../generated/prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  private validateId(id: number, field = 'id'): void {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new BadRequestException(
        `${field} debe ser un entero positivo`,
      );
    }
  }

  /**
   * Obtiene todas las entradas de un usuario.
   */
  async findAllByUser(userId: number) {
    this.validateId(userId, 'userId');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('El usuario no existe');
    }

    return this.prisma.ticket.findMany({
      where: { userId },
      include: {
        event: true,
        ticketType: true,
        seat: true,
        order: {
          select: {
            id: true,
            status: true,
            total: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });
  }

  /**
   * Obtiene una entrada por su ID.
   */
  async findOne(id: number) {
    this.validateId(id);

    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        event: true,
        ticketType: true,
        seat: true,
        order: {
          select: {
            id: true,
            status: true,
            subtotal: true,
            discount: true,
            total: true,
            userId: true,
            eventId: true,
            reservationId: true,
            cartId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        orderItem: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('La entrada no existe');
    }

    return ticket;
  }

  async findOneForUser(id: number, userId: number) {
    this.validateId(id);

    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('La entrada no existe');
    }

    if (ticket.userId !== userId) {
      throw new ForbiddenException(
        'No puedes consultar la entrada de otro usuario',
      );
    }

    return this.findOne(id);
  }

  async findAllByOrderForUser(
    orderId: number,
    userId: number,
  ) {
    this.validateId(orderId, 'orderId');

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!order) {
      throw new NotFoundException('La orden no existe');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException(
        'No puedes consultar las entradas de una orden ajena',
      );
    }

    return this.findAllByOrder(orderId);
  }

  /**
   * Emite una entrada por cada unidad pendiente de emitir
   * de los OrderItems asociados a TicketType.
   *
   * Debe ejecutarse dentro de la transacción del pago.
   */
  async issueFromOrder(
    orderId: number,
    tx: Prisma.TransactionClient,
  ) {
    this.validateId(orderId, 'orderId');

    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('La orden no existe');
    }

    if (order.status !== 'PAID') {
      throw new BadRequestException(
        'Solo se pueden emitir entradas para una orden pagada',
      );
    }

    const generatedTickets: Ticket[] = [];


    for (const item of order.items) {
      if (item.ticketTypeId === null) {
        continue;
      }

      const existingTickets = await tx.ticket.count({
        where: { orderItemId: item.id },
      });

      const ticketsToCreate =
        item.quantity - existingTickets;

      if (ticketsToCreate <= 0) {
        continue;
      }

      for (let i = 0; i < ticketsToCreate; i++) {
        const ticket = await tx.ticket.create({
          data: {
            code: randomUUID(),
            status: 'ACTIVE',
            issuedAt: new Date(),
            userId: order.userId,
            eventId: order.eventId,
            orderId: order.id,
            orderItemId: item.id,
            ticketTypeId: item.ticketTypeId,
            seatId: item.seatId,
          },
        });

        generatedTickets.push(ticket);
      }
    }

    return generatedTickets;
  }

  /**
   * Consume una entrada: ACTIVE -> USED.
   */
  async validate(code: string, userId: number) {
    if (typeof code !== 'string' || !code.trim()) {
      throw new BadRequestException(
        'Debes proporcionar un código de entrada válido',
      );
    }

    const normalizedCode = code.trim();

    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const ticket = await tx.ticket.findUnique({
          where: { code: normalizedCode },
          include: {
            event: {
              select: {
                id: true,
                organizerId: true,
              },
            },
          },
        });

        if (!ticket) {
          throw new NotFoundException('La entrada no existe');
        }

        if (ticket.event.organizerId !== userId) {
          throw new ForbiddenException(
            'Solo el organizador del evento puede validar sus entradas',
          );
        }

        const updated = await tx.ticket.updateMany({
          where: {
            id: ticket.id,
            status: 'ACTIVE',
          },
          data: {
            status: 'USED',
            usedAt: new Date(),
          },
        });

        if (updated.count !== 1) {
          throw new BadRequestException(
            'La entrada ya fue utilizada o no está disponible',
          );
        }

        return tx.ticket.findUniqueOrThrow({
          where: { id: ticket.id },
          include: {
            event: true,
            ticketType: true,
            seat: true,
            orderItem: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        });
      },
    );
  }

  /**
   * TDD: refactor Valida un lote de entradas de forma secuencial 
   * (máximo 10 por operación).
   * Vamos a refactorizar validateBatch en tickets.service.ts extrayendo 
   * la validación del tamaño del lote (MAX_BATCH_SIZE = 10) y normalizando/eliminando duplicados con 
   * Set, además de quitar el as any del test en tickets.service.spec.ts.
   */
  private static readonly MAX_BATCH_SIZE = 10;

  /**
   * Valida un lote único de entradas de forma secuencial.
   */
  async validateBatch(codes: string[], userId: number) {
    if (!Array.isArray(codes)) {
      throw new BadRequestException(
        'El lote debe contener entre 1 y 10 entradas',
      );
    }

    const uniqueNormalizedCodes = [
      ...new Set(codes.map((c) => (typeof c === 'string' ? c.trim() : ''))),
    ];

    if (
      uniqueNormalizedCodes.length === 0 ||
      uniqueNormalizedCodes.length > TicketsService.MAX_BATCH_SIZE
    ) {
      throw new BadRequestException(
        'El lote debe contener entre 1 y 10 entradas',
      );
    }

    for (const code of uniqueNormalizedCodes) {
      await this.validate(code, userId);
    }

    return {
      validatedCount: uniqueNormalizedCodes.length,
      codes: uniqueNormalizedCodes,
    };
  }

  /**
   * Obtiene todas las entradas de una orden.
   */
  async findAllByOrder(orderId: number) {
    this.validateId(orderId, 'orderId');

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true },
    });

    if (!order) {
      throw new NotFoundException('La orden no existe');
    }

    return this.prisma.ticket.findMany({
      where: { orderId },
      include: {
        ticketType: true,
        seat: true,
      },
      orderBy: { issuedAt: 'asc' },
    });
  }
}
