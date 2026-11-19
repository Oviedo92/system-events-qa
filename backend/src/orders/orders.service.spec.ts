import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReservationsService } from '../reservations/reservations.service.js';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('OrdersService', () => {
  let ordersService: OrdersService;
  let prismaService: any;
  let reservationsService: any;

  // Helper para simular Prisma.Decimal en unitPrice
  const mockDecimal = (val: number) => ({
    value: val,
    mul: jest.fn((qty: number) => val * qty),
  });

  // Helper para construir una reserva válida completa (Happy Path de create)
  const buildValidReservation = () => ({
    id: 10,
    userId: 1,
    eventId: 5,
    cartId: 20,
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 60_000),
    user: { id: 1 },
    event: { id: 5, configuration: {} },
    cart: {
      id: 20,
      userId: 1,
      eventId: 5,
      status: 'RESERVED',
      subtotal: 130,
      discount: 0,
      total: 130,
      items: [
        {
          id: 1,
          ticketTypeId: 100,
          productVariantId: null,
          quantity: 1,
          unitPrice: mockDecimal(100),
        },
        {
          id: 2,
          ticketTypeId: null,
          productVariantId: 200,
          quantity: 1,
          unitPrice: mockDecimal(30),
        },
      ],
    },
    items: [
      {
        id: 11,
        ticketTypeId: 100,
        productVariantId: null,
        quantity: 1,
        seatId: 7,
        ticketType: { id: 100, eventId: 5 },
        seat: { id: 7, eventId: 5 },
        productVariant: null,
      },
      {
        id: 12,
        ticketTypeId: null,
        productVariantId: 200,
        quantity: 1,
        seatId: null,
        ticketType: null,
        seat: null,
        productVariant: { id: 200, product: { eventId: 5 } },
      },
    ],
  });

  beforeEach(async () => {
    const mockPrismaService: any = {
      user: {
        findUnique: jest.fn(),
      },
      reservation: {
        findUnique: jest.fn(),
      },
      order: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback: any) => {
        return callback(mockPrismaService);
      }),
    };

    const mockReservationsService: any = {
      cancelWithinTransaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ReservationsService, useValue: mockReservationsService },
      ],
    }).compile();

    ordersService = module.get<OrdersService>(OrdersService);
    prismaService = module.get<PrismaService>(PrismaService);
    reservationsService = module.get<ReservationsService>(ReservationsService);
  });

  // =========================================================
  // FIND ALL BY USER & FIND ONE
  // =========================================================

  it('should return all orders for a valid user (Happy Path)', async () => {
    prismaService.user.findUnique.mockResolvedValue({ id: 1 });
    const mockOrders = [{ id: 101, total: 50 }, { id: 102, total: 120 }];
    prismaService.order.findMany.mockResolvedValue(mockOrders);

    const result = await ordersService.findAllByUser(1);

    expect(result).toEqual(mockOrders);
    expect(prismaService.user.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { id: true },
    });
  });

  it('should throw NotFoundException if user does not exist when fetching orders (Negative Case)', async () => {
    prismaService.user.findUnique.mockResolvedValue(null);

    await expect(ordersService.findAllByUser(99)).rejects.toThrow(
      new NotFoundException('El usuario no existe'),
    );
    expect(prismaService.order.findMany).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if order is not found (Negative Case)', async () => {
    prismaService.order.findUnique.mockResolvedValue(null);

    await expect(ordersService.findOne(999)).rejects.toThrow(
      new NotFoundException('La orden no existe'),
    );
  });

  it('should return order details when user owns the order in findOneForUser (Happy Path)', async () => {
    prismaService.order.findUnique
      .mockResolvedValueOnce({ id: 5, userId: 1 })
      .mockResolvedValueOnce({ id: 5, userId: 1, status: 'PENDING' });

    const result = await ordersService.findOneForUser(5, 1);

    expect(result).toEqual({ id: 5, userId: 1, status: 'PENDING' });
  });

  it('should throw ForbiddenException if order belongs to another user (Negative Case)', async () => {
    prismaService.order.findUnique.mockResolvedValue({ id: 5, userId: 2 });

    await expect(ordersService.findOneForUser(5, 1)).rejects.toThrow(
      new ForbiddenException('No puedes consultar la orden de otro usuario'),
    );
  });

  // =========================================================
  // CREATE ORDER
  // =========================================================

  it('should create an order with tickets (seated) and product variants successfully (Happy Path)', async () => {
    const validReservation = buildValidReservation();
    prismaService.reservation.findUnique.mockResolvedValue(validReservation);
    prismaService.order.findUnique
      .mockResolvedValueOnce(null) // no existe orden previa para reservationId
      .mockResolvedValueOnce({ id: 50, status: 'PENDING', total: 130 }); // retorno de findOne(50)
    prismaService.order.create.mockResolvedValue({ id: 50 });

    const result = await ordersService.create(1, { reservationId: 10 });

    expect(prismaService.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 1,
          eventId: 5,
          reservationId: 10,
          cartId: 20,
          status: 'PENDING',
        }),
      }),
    );
    expect(result).toEqual({ id: 50, status: 'PENDING', total: 130 });
  });

  it('should throw NotFoundException if reservation does not exist when creating order', async () => {
    prismaService.reservation.findUnique.mockResolvedValue(null);

    await expect(
      ordersService.create(1, { reservationId: 999 }),
    ).rejects.toThrow(new NotFoundException('La reserva no existe'));
  });

  it('should throw ForbiddenException if reservation belongs to another user', async () => {
    const reservation = buildValidReservation();
    reservation.userId = 2;
    prismaService.reservation.findUnique.mockResolvedValue(reservation);

    await expect(
      ordersService.create(1, { reservationId: 10 }),
    ).rejects.toThrow(
      new ForbiddenException(
        'No puedes crear una orden a partir de una reserva ajena',
      ),
    );
  });

  it('should throw BadRequestException if reservation is not PENDING or is expired (Edge Case)', async () => {
    const expiredReservation = buildValidReservation();
    expiredReservation.expiresAt = new Date(Date.now() - 10_000);
    prismaService.reservation.findUnique.mockResolvedValue(expiredReservation);

    await expect(
      ordersService.create(1, { reservationId: 10 }),
    ).rejects.toThrow(new BadRequestException('La reserva ha expirado'));
  });

  it('should throw BadRequestException if cart is not RESERVED or is empty', async () => {
    const reservation = buildValidReservation();
    reservation.cart.status = 'OPEN';
    prismaService.reservation.findUnique.mockResolvedValue(reservation);

    await expect(
      ordersService.create(1, { reservationId: 10 }),
    ).rejects.toThrow(
      new BadRequestException('El carrito asociado no está reservado'),
    );
  });

  it('should throw BadRequestException if reservation already has an associated order', async () => {
    prismaService.reservation.findUnique.mockResolvedValue(
      buildValidReservation(),
    );
    prismaService.order.findUnique.mockResolvedValue({ id: 77 });

    await expect(
      ordersService.create(1, { reservationId: 10 }),
    ).rejects.toThrow(
      new BadRequestException('La reserva ya tiene una orden asociada'),
    );
  });

  it('should throw BadRequestException if reserved quantities do not match cart quantities', async () => {
    const reservation = buildValidReservation();
    reservation.cart.items[0].quantity = 3; // carrito dice 3, reserva tiene 1
    prismaService.reservation.findUnique.mockResolvedValue(reservation);
    prismaService.order.findUnique.mockResolvedValue(null);

    await expect(
      ordersService.create(1, { reservationId: 10 }),
    ).rejects.toThrow(
      new BadRequestException(
        'Las cantidades reservadas no coinciden con las cantidades del carrito',
      ),
    );
  });

  // =========================================================
  // CANCEL ORDER
  // =========================================================

  it('should cancel a PENDING order without approved payment successfully (Happy Path)', async () => {
    const mockOrder = {
      id: 10,
      userId: 1,
      reservationId: 88,
      status: 'PENDING',
      payment: null,
      reservation: { id: 88 },
    };
    prismaService.order.findUnique.mockResolvedValue(mockOrder);
    prismaService.order.update.mockResolvedValue({
      id: 10,
      status: 'CANCELLED',
    });

    const result = await ordersService.cancel(10, 1);

    expect(reservationsService.cancelWithinTransaction).toHaveBeenCalledWith(
      prismaService,
      88,
    );
    expect(prismaService.order.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { status: 'CANCELLED' },
    });
    expect(result.status).toEqual('CANCELLED');
  });

  it('should throw BadRequestException if order has a PAID or APPROVED payment', async () => {
    const mockOrder = {
      id: 10,
      userId: 1,
      reservationId: 88,
      status: 'PENDING',
      payment: { status: 'PAID' },
      reservation: { id: 88 },
    };
    prismaService.order.findUnique.mockResolvedValue(mockOrder);

    await expect(ordersService.cancel(10, 1)).rejects.toThrow(
      new BadRequestException(
        'La orden tiene un pago que debe resolverse antes de cancelarla',
      ),
    );
    expect(
      reservationsService.cancelWithinTransaction,
    ).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if order is already cancelled (Edge Case)', async () => {
    const mockOrder = {
      id: 10,
      userId: 1,
      status: 'CANCELLED',
      payment: null,
      reservation: {},
    };
    prismaService.order.findUnique.mockResolvedValue(mockOrder);

    await expect(ordersService.cancel(10, 1)).rejects.toThrow(
      new BadRequestException('La orden ya está cancelada'),
    );
    expect(
      reservationsService.cancelWithinTransaction,
    ).not.toHaveBeenCalled();
  });
});