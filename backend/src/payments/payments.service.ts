import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { CreatePaymentDto } from './dto/create-payments.dto';
import { UpdatePaymentDto } from './dto/update-payments.dto';
import { EventAvailabilityService } from '../event-availability/event-availability.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventAvailabilityService: EventAvailabilityService,
    private readonly ticketsService: TicketsService,
  ) { }

  async findAllByUser(userId: number) {
    if (!Number.isInteger(userId) || userId < 1) {
      throw new BadRequestException('El ID del usuario no es válido');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('El usuario no existe');
    }

    return this.prisma.payment.findMany({
      where: { order: { userId } },
      include: {
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
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    if (!Number.isInteger(id) || id < 1) {
      throw new BadRequestException('El ID del pago no es válido');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
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
      },
    });

    if (!payment) {
      throw new NotFoundException('El pago no existe');
    }

    return payment;
  }

  async create(
    userId: number,
    createPaymentDto: CreatePaymentDto,
  ) {
    const { orderId } = createPaymentDto;

    if (!Number.isInteger(orderId) || orderId < 1) {
      throw new BadRequestException('El ID de la orden no es válido');
    }

    try {
      const payment = await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { reservation: true },
        });

        if (!order) {
          throw new NotFoundException('La orden no existe');
        }

        if (order.userId !== userId) {
          throw new ForbiddenException(
            'No puedes pagar una orden de otro usuario',
          );
        }

        if (order.status !== 'PENDING') {
          throw new BadRequestException(
            'La orden no está disponible para realizar el pago',
          );
        }

        if (order.reservation.status !== 'PENDING') {
          throw new BadRequestException(
            'La reserva asociada no está disponible',
          );
        }

        if (order.reservation.expiresAt <= new Date()) {
          throw new BadRequestException(
            'La reserva asociada a la orden ha expirado',
          );
        }

        const existingPayment = await tx.payment.findUnique({
          where: { orderId },
        });

        if (existingPayment) {
          throw new BadRequestException(
            'La orden ya tiene un pago asociado',
          );
        }

        return tx.payment.create({
          data: {
            orderId,
            amount: order.total,
            method: 'SIMULATED',
            status: 'PENDING',
          },
          include: {
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
          },
        });
      });

      return payment;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'La orden ya tiene un pago asociado',
        );
      }

      throw error;
    }
  }

  /**
   * Actualización pública limitada al rechazo.
   * No permite aprobar un pago mediante PATCH.
   */
  async update(
    id: number,
    userId: number,
    updatePaymentDto: UpdatePaymentDto,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          select: { userId: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('El pago no existe');
    }

    // Comprobar que el pago pertenece al usuario autenticado.
    if (payment.order.userId !== userId) {
      throw new ForbiddenException(
        'No puedes modificar el pago de otro usuario',
      );
    }

    if (!updatePaymentDto.status) {
      return this.findOne(id);
    }

    if (updatePaymentDto.status !== 'REJECTED') {
      throw new BadRequestException(
        'Este endpoint solo permite rechazar pagos',
      );
    }

    if (payment.status !== 'PENDING') {
      throw new BadRequestException(
        'Solo se pueden rechazar pagos pendientes',
      );
    }

    const result = await this.prisma.payment.updateMany({
      where: {
        id,
        status: 'PENDING',
      },
      data: {
        status: 'REJECTED',
      },
    });

    if (result.count !== 1) {
      throw new BadRequestException(
        'El pago ya no está disponible para rechazo',
      );
    }

    return this.findOne(id);
  }

  /**
   * Aprobación simulada para desarrollo.
   * Debe exponerse mediante una ruta explícita y restringida,
   * no mediante el PATCH genérico.
   */
  async simulateApproval(id: number, userId: number) {
    if (!Number.isInteger(id) || id < 1) {
      throw new BadRequestException('El ID del pago no es válido');
    }


    const eventId = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id },
      });


      if (!payment) {
        throw new NotFoundException('El pago no existe');
      }

      if (payment.status !== 'PENDING') {
        throw new BadRequestException(
          'Solo se pueden aprobar pagos pendientes',
        );
      }



      const order = await tx.order.findUnique({
        where: { id: payment.orderId },
        include: { reservation: true },
      });



      if (!order) {
        throw new NotFoundException(
          'La orden asociada al pago no existe',
        );
      }

      if (order.userId !== userId) {
        throw new ForbiddenException(
          'No puedes aprobar el pago de otro usuario',
        );
      }

      if (order.status !== 'PENDING') {
        throw new BadRequestException(
          'La orden no está disponible para realizar el pago',
        );
      }

      if (order.reservation.status !== 'PENDING') {
        throw new BadRequestException(
          'La reserva asociada no está disponible',
        );
      }

      if (order.reservation.expiresAt <= new Date()) {
        throw new BadRequestException(
          'La reserva asociada a la orden ha expirado',
        );
      }

      const now = new Date();

      const paymentUpdated = await tx.payment.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          status: 'APPROVED',
          transactionId: randomUUID(),
          paidAt: now,
        },
      });

      if (paymentUpdated.count !== 1) {
        throw new BadRequestException(
          'El pago ya no está disponible para aprobación',
        );
      }

      const orderUpdated = await tx.order.updateMany({
        where: {
          id: order.id,
          status: 'PENDING',
        },
        data: { status: 'PAID' },
      });

      if (orderUpdated.count !== 1) {
        throw new BadRequestException(
          'La orden ya no está disponible para pago',
        );
      }

      // La emisión de tickets forma parte de la misma transacción.
      await this.ticketsService.issueFromOrder(order.id, tx);

      const reservationUpdated = await tx.reservation.updateMany({
        where: {
          id: order.reservationId,
          status: 'PENDING',
          expiresAt: { gt: now },
        },
        data: { status: 'CONFIRMED' },
      });

      if (reservationUpdated.count !== 1) {
        throw new BadRequestException(
          'La reserva ya no está disponible para confirmación',
        );
      }

      return order.reservation.eventId;
    });

    await this.eventAvailabilityService.publishAvailability(eventId);

    return this.findOne(id);
  }

  async remove(id: number, userId: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          select: { userId: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('El pago no existe');
    }

    // Comprobar que el pago pertenece al usuario autenticado.
    if (payment.order.userId !== userId) {
      throw new ForbiddenException(
        'No puedes modificar el pago de otro usuario',
      );
    }

    // Conservar los pagos rechazados y aprobados como historial.
    if (payment.status !== 'PENDING') {
      throw new BadRequestException(
        'Solo se pueden eliminar pagos pendientes',
      );
    }

    const result = await this.prisma.payment.deleteMany({
      where: {
        id,
        status: 'PENDING',
      },
    });

    if (result.count !== 1) {
      throw new BadRequestException(
        'El pago ya no está disponible para eliminación',
      );
    }

    return {
      message: 'Pago pendiente eliminado correctamente',
      id,
    };
  }

  async findOneForUser(id: number, userId: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      select: {
        id: true,
        order: {
          select: { userId: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('El pago no existe');
    }

    if (payment.order.userId !== userId) {
      throw new ForbiddenException(
        'No puedes acceder al pago de otro usuario',
      );
    }

    return this.findOne(id);
  }
}
