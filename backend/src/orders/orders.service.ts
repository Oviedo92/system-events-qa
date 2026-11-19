
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationsService } from '../reservations/reservations.service';
import { CreateOrderDto } from './dto/create-orders.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reservationsService: ReservationsService,
  ) { }

  // =========================================================
  // FIND ALL BY USER
  // =========================================================

  async findAllByUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('El usuario no existe');
    }

    return this.prisma.order.findMany({
      where: { userId },
      include: {
        event: true,
        reservation: true,
        cart: true,
        items: {
          include: {
            ticketType: true,
            productVariant: {
              include: { product: true },
            },
            seat: true,
          },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // =========================================================
  // FIND ONE
  // =========================================================

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        event: true,
        reservation: true,
        cart: true,
        payment: true,
        items: {
          include: {
            ticketType: true,
            productVariant: {
              include: { product: true },
            },
            seat: true,
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('La orden no existe');
    }

    return order;
  }

  async findOneForUser(id: number, userId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
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
        'No puedes consultar la orden de otro usuario',
      );
    }

    return this.findOne(id);
  }

  // =========================================================
  // CREATE ORDER
  // =========================================================

  async create(
    userId: number,
    createOrderDto: CreateOrderDto,
  ) {
    const { reservationId } = createOrderDto;

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: {
          cart: {
            include: { items: true },
          },
          items: {
            include: {
              ticketType: true,
              productVariant: {
                include: { product: true },
              },
              seat: true,
            },
          },
          user: true,
          event: {
            include: { configuration: true },
          },
        },
      });

      if (!reservation) {
        throw new NotFoundException('La reserva no existe');
      }

      if (
        reservation.userId !== userId ||
        reservation.user.id !== userId
      ) {
        throw new ForbiddenException(
          'No puedes crear una orden a partir de una reserva ajena',
        );
      }

      // -------------------------------------------------------
      // RESERVATION STATUS AND EXPIRATION
      // -------------------------------------------------------

      if (reservation.status !== 'PENDING') {
        throw new BadRequestException(
          'La reserva no está disponible para generar una orden',
        );
      }

      if (reservation.expiresAt <= new Date()) {
        throw new BadRequestException('La reserva ha expirado');
      }

      // -------------------------------------------------------
      // CART RELATIONSHIP AND STATUS
      // -------------------------------------------------------

      const cart = reservation.cart;

      if (!cart) {
        throw new BadRequestException(
          'La reserva no tiene un carrito asociado',
        );
      }

      if (
        cart.id !== reservation.cartId ||
        cart.userId !== reservation.userId ||
        cart.eventId !== reservation.eventId ||
        reservation.user.id !== reservation.userId ||
        reservation.event.id !== reservation.eventId
      ) {
        throw new BadRequestException(
          'La reserva, el carrito, el usuario y el evento no corresponden entre sí',
        );
      }

      if (cart.status !== 'RESERVED') {
        throw new BadRequestException(
          'El carrito asociado no está reservado',
        );
      }

      if (cart.items.length === 0) {
        throw new BadRequestException(
          'No se puede crear una orden con un carrito vacío',
        );
      }

      if (reservation.items.length === 0) {
        throw new BadRequestException(
          'La reserva no contiene elementos reservados',
        );
      }

      // -------------------------------------------------------
      // ONE ORDER PER RESERVATION
      // -------------------------------------------------------

      const existingOrder = await tx.order.findUnique({
        where: { reservationId },
        select: { id: true },
      });

      if (existingOrder) {
        throw new BadRequestException(
          'La reserva ya tiene una orden asociada',
        );
      }

      // -------------------------------------------------------
      // VALIDATE CART ITEMS AND INDEX THEM BY TYPE
      // -------------------------------------------------------

      const cartItemsByKey = new Map<
        string,
        (typeof cart.items)[number]
      >();

      for (const cartItem of cart.items) {
        const hasTicketType = cartItem.ticketTypeId !== null;
        const hasProductVariant = cartItem.productVariantId !== null;

        if (hasTicketType === hasProductVariant) {
          throw new BadRequestException(
            'Cada elemento del carrito debe corresponder a un TicketType o un ProductVariant, pero no a ambos',
          );
        }

        const key = hasTicketType
          ? `ticket:${cartItem.ticketTypeId}`
          : `variant:${cartItem.productVariantId}`;

        if (cartItemsByKey.has(key)) {
          throw new BadRequestException(
            'El carrito contiene elementos duplicados del mismo tipo',
          );
        }

        cartItemsByKey.set(key, cartItem);
      }

      // -------------------------------------------------------
      // BUILD ORDER ITEMS AND AGGREGATE RESERVED QUANTITIES
      // -------------------------------------------------------

      type OrderItemData = {
        quantity: number;
        unitPrice: (typeof cart.items)[number]['unitPrice'];
        subtotal: Prisma.Decimal;
        ticketTypeId?: number;
        productVariantId?: number;
        seatId?: number;
      };

      const orderItemsData: OrderItemData[] = [];
      const reservedQuantities = new Map<string, number>();
      const assignedSeatIds = new Set<number>();

      for (const reservationItem of reservation.items) {
        const hasTicketType = reservationItem.ticketTypeId !== null;
        const hasProductVariant =
          reservationItem.productVariantId !== null;

        if (hasTicketType === hasProductVariant) {
          throw new BadRequestException(
            'Cada elemento de reserva debe corresponder a un TicketType o un ProductVariant, pero no a ambos',
          );
        }

        if (reservationItem.quantity < 1) {
          throw new BadRequestException(
            'La cantidad de un elemento reservado debe ser positiva',
          );
        }

        if (hasTicketType) {
          const key = `ticket:${reservationItem.ticketTypeId}`;
          const cartItem = cartItemsByKey.get(key);

          if (!cartItem) {
            throw new BadRequestException(
              'Un TicketType reservado no pertenece al carrito',
            );
          }

          if (
            reservationItem.ticketType?.eventId !== reservation.eventId
          ) {
            throw new BadRequestException(
              'El tipo de entrada no pertenece al evento de la reserva',
            );
          }

          if (
            reservationItem.seatId !== null &&
            reservationItem.quantity !== 1
          ) {
            throw new BadRequestException(
              'Un elemento con asiento asignado debe tener cantidad uno',
            );
          }

          if (reservationItem.seatId !== null) {
            if (
              !reservationItem.seat ||
              reservationItem.seat.eventId !== reservation.eventId
            ) {
              throw new BadRequestException(
                'El asiento no pertenece al evento de la reserva',
              );
            }

            if (assignedSeatIds.has(reservationItem.seatId)) {
              throw new BadRequestException(
                'Un asiento no puede asignarse a más de un elemento de la orden',
              );
            }

            assignedSeatIds.add(reservationItem.seatId);
          }

          reservedQuantities.set(
            key,
            (reservedQuantities.get(key) ?? 0) +
            reservationItem.quantity,
          );

          orderItemsData.push({
            quantity: reservationItem.quantity,
            unitPrice: cartItem.unitPrice,
            subtotal: cartItem.unitPrice.mul(
              reservationItem.quantity,
            ),
            ticketTypeId: reservationItem.ticketTypeId!,
            seatId: reservationItem.seatId ?? undefined,
          });

          continue;
        }

        // -----------------------------------------------------
        // PRODUCT VARIANT
        // -----------------------------------------------------

        if (reservationItem.seatId !== null) {
          throw new BadRequestException(
            'Un producto no puede tener un asiento asignado',
          );
        }

        const key = `variant:${reservationItem.productVariantId}`;
        const cartItem = cartItemsByKey.get(key);

        if (!cartItem) {
          throw new BadRequestException(
            'Un ProductVariant reservado no pertenece al carrito',
          );
        }

        if (
          !reservationItem.productVariant ||
          reservationItem.productVariant.product.eventId !==
          reservation.eventId
        ) {
          throw new BadRequestException(
            'El producto no pertenece al evento de la reserva',
          );
        }

        reservedQuantities.set(
          key,
          (reservedQuantities.get(key) ?? 0) +
          reservationItem.quantity,
        );

        orderItemsData.push({
          quantity: reservationItem.quantity,
          unitPrice: cartItem.unitPrice,
          subtotal: cartItem.unitPrice.mul(
            reservationItem.quantity,
          ),
          productVariantId: reservationItem.productVariantId!,
        });
      }

      // -------------------------------------------------------
      // EXACT QUANTITY MATCH
      //
      // Handles split reservation items for individually
      // assigned seats by comparing aggregated quantities.
      // -------------------------------------------------------

      for (const [key, cartItem] of cartItemsByKey) {
        const reservedQuantity = reservedQuantities.get(key) ?? 0;

        if (reservedQuantity !== cartItem.quantity) {
          throw new BadRequestException(
            'Las cantidades reservadas no coinciden con las cantidades del carrito',
          );
        }
      }

      for (const key of reservedQuantities.keys()) {
        if (!cartItemsByKey.has(key)) {
          throw new BadRequestException(
            'La reserva contiene un elemento que no existe en el carrito',
          );
        }
      }

      if (orderItemsData.length === 0) {
        throw new BadRequestException(
          'No se pudieron generar los elementos de la orden',
        );
      }

      // -------------------------------------------------------
      // CREATE ORDER
      //
      // Inventory is not decremented here: the reservation
      // already performed that operation.
      // -------------------------------------------------------

      return tx.order.create({
        data: {
          userId: reservation.userId,
          eventId: reservation.eventId,
          reservationId: reservation.id,
          cartId: cart.id,
          status: 'PENDING',
          subtotal: cart.subtotal,
          discount: cart.discount,
          total: cart.total,
          items: {
            create: orderItemsData,
          },
        },
        select: { id: true },
      });
    });

    return this.findOne(createdOrder.id);
  }

  // =========================================================
  // CANCEL ORDER
  // =========================================================

  async cancel(id: number, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: {
          payment: true,
          reservation: true,
        },
      });

      if (!order) {
        throw new NotFoundException('La orden no existe');
      }

      if (order.userId !== userId) {
        throw new ForbiddenException(
          'No puedes cancelar la orden de otro usuario',
        );
      }

      if (order.status === 'CANCELLED') {
        throw new BadRequestException('La orden ya está cancelada');
      }

      if (order.status !== 'PENDING') {
        throw new BadRequestException(
          'Solo se pueden cancelar órdenes pendientes',
        );
      }

      if (
        order.payment?.status === 'APPROVED' ||
        order.payment?.status === 'PAID' ||
        order.payment?.status === 'PROCESSING'
      ) {
        throw new BadRequestException(
          'La orden tiene un pago que debe resolverse antes de cancelarla',
        );
      }

      // Cancel the reservation, release inventory and seats,
      // and update the cart inside this same transaction.
      await this.reservationsService.cancelWithinTransaction(
        tx,
        order.reservationId,
      );

      return tx.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
    });
  }
}