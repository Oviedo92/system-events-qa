import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('TicketsService', () => {
  let ticketsService: TicketsService;
  let prismaService: any;

  beforeEach(async () => {
    const mockPrismaService: any = {
      user: {
        findUnique: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
      },
      ticket: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback: any) => {
        return callback(mockPrismaService);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    ticketsService = module.get<TicketsService>(TicketsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  // =========================================================
  // FIND ALL BY USER & VALIDATE ID
  // =========================================================

  it('should return all tickets for a valid user (Happy Path)', async () => {
    prismaService.user.findUnique.mockResolvedValue({ id: 1 });
    const mockTickets = [{ id: 10, code: 'UUID-1' }, { id: 11, code: 'UUID-2' }];
    prismaService.ticket.findMany.mockResolvedValue(mockTickets);

    const result = await ticketsService.findAllByUser(1);

    expect(result).toEqual(mockTickets);
    expect(prismaService.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 1 } }),
    );
  });

  it('should throw NotFoundException if user does not exist in findAllByUser', async () => {
    prismaService.user.findUnique.mockResolvedValue(null);

    await expect(ticketsService.findAllByUser(999)).rejects.toThrow(
      new NotFoundException('El usuario no existe'),
    );
  });

  it('should throw BadRequestException when userId is zero or negative (Edge Case)', async () => {
    await expect(ticketsService.findAllByUser(0)).rejects.toThrow(
      new BadRequestException('userId debe ser un entero positivo'),
    );
    expect(prismaService.user.findUnique).not.toHaveBeenCalled();
  });

  // =========================================================
  // FIND ONE & FIND ONE FOR USER
  // =========================================================

  it('should return ticket details when user owns the ticket in findOneForUser (Happy Path)', async () => {
    prismaService.ticket.findUnique
      .mockResolvedValueOnce({ id: 5, userId: 1 })
      .mockResolvedValueOnce({ id: 5, userId: 1, status: 'ACTIVE' });

    const result = await ticketsService.findOneForUser(5, 1);

    expect(result).toEqual({ id: 5, userId: 1, status: 'ACTIVE' });
  });

  it('should throw ForbiddenException if ticket belongs to another user in findOneForUser', async () => {
    prismaService.ticket.findUnique.mockResolvedValue({ id: 5, userId: 2 });

    await expect(ticketsService.findOneForUser(5, 1)).rejects.toThrow(
      new ForbiddenException('No puedes consultar la entrada de otro usuario'),
    );
  });

  it('should throw NotFoundException if ticket does not exist in findOne', async () => {
    prismaService.ticket.findUnique.mockResolvedValue(null);

    await expect(ticketsService.findOne(888)).rejects.toThrow(
      new NotFoundException('La entrada no existe'),
    );
  });

  // =========================================================
  // FIND ALL BY ORDER & FIND ALL BY ORDER FOR USER
  // =========================================================

  it('should return all tickets of an order when user owns the order (Happy Path)', async () => {
    prismaService.order.findUnique
      .mockResolvedValueOnce({ id: 20, userId: 1 })
      .mockResolvedValueOnce({ id: 20 });
    const mockTickets = [{ id: 1, orderId: 20 }];
    prismaService.ticket.findMany.mockResolvedValue(mockTickets);

    const result = await ticketsService.findAllByOrderForUser(20, 1);

    expect(result).toEqual(mockTickets);
  });

  it('should throw ForbiddenException if order belongs to another user in findAllByOrderForUser', async () => {
    prismaService.order.findUnique.mockResolvedValue({ id: 20, userId: 2 });

    await expect(ticketsService.findAllByOrderForUser(20, 1)).rejects.toThrow(
      new ForbiddenException('No puedes consultar las entradas de una orden ajena'),
    );
  });

  // =========================================================
  // ISSUE FROM ORDER
  // =========================================================

  it('should generate tickets for each pending unit in a PAID order (Happy Path)', async () => {
    const mockOrder = {
      id: 20,
      status: 'PAID',
      userId: 3,
      eventId: 10,
      items: [
        { id: 100, ticketTypeId: 2, quantity: 2, seatId: null },
        { id: 101, ticketTypeId: null, quantity: 1, seatId: null }, // producto, debe ignorarse
      ],
    };
    prismaService.order.findUnique.mockResolvedValue(mockOrder);
    prismaService.ticket.count.mockResolvedValue(0);
    prismaService.ticket.create.mockImplementation(async ({ data }: { data: any }) => ({
      id: Math.random(),
      ...data,
    }));

    const result = await ticketsService.issueFromOrder(20, prismaService);

    expect(result).toHaveLength(2);
    expect(prismaService.ticket.create).toHaveBeenCalledTimes(2);
  });

  it('should throw BadRequestException when trying to issue tickets from an unpaid order', async () => {
    prismaService.order.findUnique.mockResolvedValue({
      id: 20,
      status: 'PENDING',
      items: [],
    });

    await expect(
      ticketsService.issueFromOrder(20, prismaService),
    ).rejects.toThrow(
      new BadRequestException('Solo se pueden emitir entradas para una orden pagada'),
    );
  });

  // =========================================================
  // VALIDATE TICKET
  // =========================================================

  it('should validate and mark an active ticket as USED (Happy Path)', async () => {
    const mockTicket = {
      id: 1,
      code: 'UUID-VALID-123',
      status: 'ACTIVE',
      event: { id: 10, organizerId: 5 },
    };
    const mockUpdatedTicket = { ...mockTicket, status: 'USED' };

    prismaService.ticket.findUnique.mockResolvedValue(mockTicket);
    prismaService.ticket.updateMany.mockResolvedValue({ count: 1 });
    prismaService.ticket.findUniqueOrThrow.mockResolvedValue(mockUpdatedTicket);

    const result = await ticketsService.validate('  UUID-VALID-123  ', 5);

    expect(result.status).toEqual('USED');
    expect(prismaService.ticket.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1, status: 'ACTIVE' },
      }),
    );
  });

  it('should throw ForbiddenException if user is not the event organizer (Negative Case)', async () => {
    const mockTicket = {
      id: 1,
      code: 'UUID-VALID-123',
      status: 'ACTIVE',
      event: { id: 10, organizerId: 5 },
    };
    prismaService.ticket.findUnique.mockResolvedValue(mockTicket);

    await expect(
      ticketsService.validate('UUID-VALID-123', 99),
    ).rejects.toThrow(
      new ForbiddenException('Solo el organizador del evento puede validar sus entradas'),
    );
    expect(prismaService.ticket.updateMany).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException if ticket was already used (Negative Case)', async () => {
    const mockTicket = {
      id: 1,
      code: 'UUID-USED-123',
      status: 'USED',
      event: { id: 10, organizerId: 5 },
    };
    prismaService.ticket.findUnique.mockResolvedValue(mockTicket);
    prismaService.ticket.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      ticketsService.validate('UUID-USED-123', 5),
    ).rejects.toThrow(
      new BadRequestException('La entrada ya fue utilizada o no está disponible'),
    );
  });
});