import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventAvailabilityService } from '../event-availability/event-availability.service';

const MAX_PROMOTER_ACTIVE_EVENTS = 2;

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventAvailabilityService: EventAvailabilityService,
  ) {}

  async create(createEventDto: CreateEventDto, organizerId: number) {
    const organizer = await this.prisma.user.findUnique({
      where: { id: organizerId },
    });

    if (!organizer) {
      throw new NotFoundException('El organizador no existe');
    }

    if (organizer.role !== 'PROMOTER' && organizer.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los promotores aprobados o administradores pueden crear eventos',
      );
    }

    if (organizer.role === 'PROMOTER') {
      const activeEventsCount = await this.prisma.event.count({
        where: {
          organizerId,
          status: { in: ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED'] },
        },
      });

      if (activeEventsCount >= MAX_PROMOTER_ACTIVE_EVENTS) {
        throw new BadRequestException(
          `Has alcanzado el límite máximo de ${MAX_PROMOTER_ACTIVE_EVENTS} eventos activos permitidos por promotor.`,
        );
      }
    }

    const template = await this.prisma.eventTemplate.findUnique({
      where: { id: createEventDto.templateId },
    });

    if (!template) {
      throw new NotFoundException('La plantilla del evento no existe');
    }

    const category = await this.prisma.eventCategory.findUnique({
      where: { id: createEventDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('La categoría del evento no existe');
    }

    const startAt = new Date(createEventDto.startAt);
    const endAt = new Date(createEventDto.endAt);

    if (startAt >= endAt) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior a la fecha de finalización',
      );
    }

    this.validateCoordinates(createEventDto.latitude, createEventDto.longitude);
    const slug = await this.generateUniqueSlug(createEventDto.name);

    return this.prisma.$transaction(async (tx) => {
      const createdEvent = await tx.event.create({
        data: {
          name: createEventDto.name,
          slug,
          description: createEventDto.description,
          startAt,
          endAt,
          venue: createEventDto.venue,
          address: createEventDto.address,
          city: createEventDto.city,
          coverImageUrl: createEventDto.coverImageUrl,
          latitude: createEventDto.latitude,
          longitude: createEventDto.longitude,
          capacity: createEventDto.capacity,
          status: 'DRAFT',
          templateId: createEventDto.templateId,
          categoryId: category.id,
          organizerId,
          configuration: {
            create: {
              usesZones: template.usesZones,
              usesSeats: template.usesSeats,
              usesProducts: template.usesProducts,
              usesPromotions: template.usesPromotions,
              usesQr: template.usesQr,
            },
          },
        },
      });

      // 1. Zonas y sus tipos de entrada (o entrada general)
      let firstZoneId: number | null = null;
      if (template.usesZones && createEventDto.zones?.length) {
        for (const zoneInput of createEventDto.zones) {
          const zone = await tx.zone.create({
            data: {
              name: zoneInput.name,
              capacity: zoneInput.capacity,
              eventId: createdEvent.id,
            },
          });
          if (!firstZoneId) firstZoneId = zone.id;

          await tx.ticketType.create({
            data: {
              name: `Entrada ${zoneInput.name}`,
              price: zoneInput.price,
              quantity: zoneInput.capacity,
              available: zoneInput.capacity,
              eventId: createdEvent.id,
              zoneId: zone.id,
            },
          });
        }
      } else if (createEventDto.generalTickets?.length) {
        for (const ticketInput of createEventDto.generalTickets) {
          await tx.ticketType.create({
            data: {
              name: ticketInput.name,
              price: ticketInput.price,
              quantity: ticketInput.quantity,
              available: ticketInput.quantity,
              eventId: createdEvent.id,
            },
          });
        }
      } else {
        await tx.ticketType.create({
          data: {
            name: 'Entrada General',
            price: 50000,
            quantity: createEventDto.capacity,
            available: createEventDto.capacity,
            eventId: createdEvent.id,
          },
        });
      }

      // 2. Matriz de sillas en tiempo real
      if (template.usesSeats && createEventDto.seatGrid) {
        const { rows, seatsPerRow } = createEventDto.seatGrid;
        const seatsData: Array<{
          row: string;
          number: number;
          eventId: number;
          zoneId: number | null;
        }> = [];

        for (let r = 0; r < rows; r++) {
          const rowLabel = String.fromCharCode(65 + r);
          for (let s = 1; s <= seatsPerRow; s++) {
            seatsData.push({
              row: rowLabel,
              number: s,
              eventId: createdEvent.id,
              zoneId: firstZoneId,
            });
          }
        }

        if (seatsData.length > 0) {
          await tx.seat.createMany({ data: seatsData });
        }
      }

      // 3. Productos / Merchandising oficiales del evento
      if (template.usesProducts && createEventDto.products?.length) {
        let productCategory = await tx.productCategory.findFirst();
        if (!productCategory) {
          productCategory = await tx.productCategory.create({
            data: {
              name: 'Merchandising Oficial',
              slug: 'merchandising-oficial',
            },
          });
        }

        for (let i = 0; i < createEventDto.products.length; i++) {
          const prodInput = createEventDto.products[i];
          const prod = await tx.product.create({
            data: {
              name: prodInput.name,
              eventId: createdEvent.id,
              categoryId: productCategory.id,
            },
          });

          await tx.productVariant.create({
            data: {
              sku: `EVT-${createdEvent.id}-PRD-${prod.id}-${Date.now() + i}`,
              price: prodInput.price,
              quantity: prodInput.stock,
              available: prodInput.stock,
              productId: prod.id,
            },
          });
        }
      }

      // 4. Promociones y cupones
      if (template.usesPromotions && createEventDto.promotions?.length) {
        for (const promoInput of createEventDto.promotions) {
          await tx.promotion.create({
            data: {
              name: promoInput.name,
              code: promoInput.code.toUpperCase(),
              type: 'PERCENTAGE',
              value: promoInput.discountPercent,
              appliesToAll: true,
              eventId: createdEvent.id,
            },
          });
        }
      }

      const fullEvent = await tx.event.findUniqueOrThrow({
        where: { id: createdEvent.id },
        include: {
          configuration: true,
          category: true,
          template: true,
        },
      });

      return {
        ...fullEvent,
        metrics: {
          ticketsSold: 0,
          ticketsRevenue: 0,
          productsSold: 0,
          productsRevenue: 0,
          totalRevenue: 0,
          occupiedSeats: 0,
          totalSeats: createEventDto.seatGrid
            ? createEventDto.seatGrid.rows * createEventDto.seatGrid.seatsPerRow
            : createEventDto.capacity,
        },
      };
    });
  }

  async findMyEvents(organizerId: number) {
    const events = await this.prisma.event.findMany({
      where: { organizerId },
      include: {
        configuration: true,
        category: true,
        template: true,
        _count: {
          select: {
            tickets: true,
            seats: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      events.map(async (ev) => {
        const [ordersAgg, soldSeatsCount] = await Promise.all([
          this.prisma.order.aggregate({
            where: { eventId: ev.id, status: 'PAID' },
            _sum: { total: true },
          }),
          this.prisma.seat.count({
            where: { eventId: ev.id, status: { in: ['RESERVED', 'SOLD'] } },
          }),
        ]);

        const productsSoldAgg = await this.prisma.orderItem.aggregate({
          where: {
            order: { eventId: ev.id, status: 'PAID' },
            productVariantId: { not: null },
          },
          _sum: { quantity: true, subtotal: true },
        });

        const totalRevenue = Number(ordersAgg._sum.total ?? 0);
        const productsRevenue = Number(productsSoldAgg._sum.subtotal ?? 0);
        const productsSold = Number(productsSoldAgg._sum.quantity ?? 0);

        return {
          ...ev,
          metrics: {
            ticketsSold: ev._count.tickets,
            ticketsRevenue: Math.max(0, totalRevenue - productsRevenue),
            productsSold,
            productsRevenue,
            totalRevenue,
            occupiedSeats: soldSeatsCount,
            totalSeats: ev._count.seats || ev.capacity,
          },
        };
      }),
    );
  }

  async submitForReview(id: number, organizerId: number) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { ticketTypes: { where: { deletedAt: null } } },
    });

    if (!event) {
      throw new NotFoundException('El evento no existe');
    }

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('No tienes permiso para gestionar este evento');
    }

    if (event.ticketTypes.length === 0) {
      throw new BadRequestException(
        'El evento debe tener al menos un tipo de entrada antes de enviarse a revisión',
      );
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        status: 'PENDING_REVIEW',
        rejectionReason: null,
      },
      include: {
        configuration: true,
        category: true,
        template: true,
      },
    });
  }

  async findPendingForModeration(userId: number, role: string) {
    if (role === 'ADMIN') {
      return this.prisma.event.findMany({
        where: { status: 'PENDING_REVIEW' },
        include: {
          organizer: { select: { id: true, name: true, email: true } },
          moderator: { select: { id: true, name: true, email: true } },
          category: true,
          template: true,
          configuration: true,
        },
        orderBy: { createdAt: 'asc' },
      });
    }

    return this.prisma.event.findMany({
      where: {
        moderatorId: userId,
        status: 'PENDING_REVIEW',
      },
      include: {
        organizer: { select: { id: true, name: true, email: true } },
        category: true,
        template: true,
        configuration: true,
      },
    });
  }

  async assignModerator(eventId: number, moderatorId: number, actorRole: string) {
    if (actorRole !== 'ADMIN') {
      throw new ForbiddenException('Solo el administrador puede delegar eventos a moderadores');
    }

    const moderator = await this.prisma.user.findUnique({
      where: { id: moderatorId },
      include: {
        assignedApplication: true,
        assignedEvent: true,
      },
    });

    if (!moderator || moderator.role !== 'MODERATOR') {
      throw new BadRequestException('El usuario seleccionado no es un moderador válido');
    }

    if (moderator.assignedApplication || moderator.assignedEvent) {
      throw new BadRequestException(
        'Este moderador ya tiene una solicitud o evento asignado (cardinalidad estricta 1 a 1).',
      );
    }

    return this.prisma.event.update({
      where: { id: eventId },
      data: { moderatorId },
      include: {
        moderator: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async reviewEvent(
    eventId: number,
    actorId: number,
    actorRole: string,
    decision: 'APPROVE' | 'REJECT',
    rejectionReason?: string,
  ) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('El evento no existe');
    }

    if (actorRole === 'MODERATOR' && event.moderatorId !== actorId) {
      throw new ForbiddenException('Este evento no está asignado a tu cola 1:1');
    }

    if (decision === 'REJECT' && !rejectionReason?.trim()) {
      throw new BadRequestException('Debes indicar el motivo del rechazo');
    }

    return this.prisma.event.update({
      where: { id: eventId },
      data: {
        status: decision === 'APPROVE' ? 'PUBLISHED' : 'REJECTED',
        rejectionReason: decision === 'REJECT' ? rejectionReason?.trim() : null,
        moderatorId: null, // Libera al moderador 1:1 una vez resuelto
      },
    });
  }

  async findBuyers(eventId: number, organizerId: number) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('El evento no existe');
    }

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException('No tienes permiso para ver los compradores de este evento');
    }

    const orders = await this.prisma.order.findMany({
      where: { eventId, status: 'PAID' },
      include: {
        user: { select: { name: true, email: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => {
      const ticketsCount = order.items
        .filter((i) => i.ticketTypeId !== null)
        .reduce((sum, i) => sum + i.quantity, 0);
      const productsCount = order.items
        .filter((i) => i.productVariantId !== null)
        .reduce((sum, i) => sum + i.quantity, 0);

      return {
        orderId: order.id,
        buyerName: order.user.name,
        buyerEmail: order.user.email,
        ticketsCount,
        productsCount,
        totalPaid: Number(order.total),
        purchasedAt: order.createdAt.toISOString(),
      };
    });
  }

  async publish(id: number) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        endAt: true,
        ticketTypes: {
          where: { deletedAt: null, status: 'ACTIVE' },
          select: { id: true },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('El evento no existe');
    }

    if (event.status === 'PUBLISHED') {
      throw new BadRequestException('El evento ya está publicado');
    }

    if (event.endAt <= new Date()) {
      throw new BadRequestException('No se puede publicar un evento que ya finalizó');
    }

    if (event.ticketTypes.length === 0) {
      throw new BadRequestException('El evento necesita al menos un tipo de entrada activo');
    }

    return this.prisma.event.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });
  }

  async findAll(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      city?: string;
      from?: string;
      to?: string;
    } = {},
  ) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 12);

    if (!Number.isInteger(page) || page < 1) {
      throw new BadRequestException('page debe ser un entero mayor o igual a 1');
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 48) {
      throw new BadRequestException('limit debe ser un entero entre 1 y 48');
    }

    const search = query.search?.trim();
    const city = query.city?.trim();
    const startAtFilter: { gte?: Date; lte?: Date } = {};

    if (query.from) {
      const from = new Date(query.from);
      if (Number.isNaN(from.getTime())) {
        throw new BadRequestException('from debe ser una fecha válida');
      }
      startAtFilter.gte = from;
    }

    if (query.to) {
      const to = new Date(query.to);
      if (Number.isNaN(to.getTime())) {
        throw new BadRequestException('to debe ser una fecha válida');
      }
      startAtFilter.lte = to;
    }

    if (startAtFilter.gte && startAtFilter.lte && startAtFilter.gte > startAtFilter.lte) {
      throw new BadRequestException('from no puede ser posterior a to');
    }

    const where = {
      status: 'PUBLISHED',
      endAt: { gt: new Date() },
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
      ...(city && city.toLowerCase() !== 'todas'
        ? { city: { equals: city, mode: 'insensitive' as const } }
        : {}),
      ...(Object.keys(startAtFilter).length > 0 ? { startAt: startAtFilter } : {}),
    };

    const [total, events] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          city: true,
          venue: true,
          address: true,
          startAt: true,
          endAt: true,
          capacity: true,
          coverImageUrl: true,
          status: true,
          ticketTypes: {
            where: { deletedAt: null, status: 'ACTIVE' },
            select: { price: true },
          },
        },
        orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const data = await Promise.all(
      events.map(async ({ ticketTypes, ...event }) => ({
        ...event,
        minPrice:
          ticketTypes.length > 0
            ? Math.min(...ticketTypes.map((ticket) => Number(ticket.price)))
            : null,
        availability: await this.eventAvailabilityService.getAvailability(event.id),
      })),
    );

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        configuration: true,
        images: { orderBy: { position: 'asc' } },
        ticketTypes: { where: { deletedAt: null }, orderBy: { price: 'asc' } },
        template: true,
      },
    });

    if (!event) {
      throw new NotFoundException('El evento no existe');
    }

    return event;
  }

  async update(id: number, updateEventDto: UpdateEventDto) {
    const event = await this.prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new NotFoundException('El evento no existe');
    }

    const startAt = updateEventDto.startAt ? new Date(updateEventDto.startAt) : event.startAt;
    const endAt = updateEventDto.endAt ? new Date(updateEventDto.endAt) : event.endAt;

    if (startAt >= endAt) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior a la fecha de finalización',
      );
    }

    this.validateCoordinates(updateEventDto.latitude, updateEventDto.longitude);

    return this.prisma.event.update({
      where: { id },
      data: {
        name: updateEventDto.name,
        description: updateEventDto.description,
        startAt,
        endAt,
        venue: updateEventDto.venue,
        address: updateEventDto.address,
        city: updateEventDto.city,
        latitude: updateEventDto.latitude,
        longitude: updateEventDto.longitude,
        capacity: updateEventDto.capacity,
      },
    });
  }

  private validateCoordinates(latitude?: number, longitude?: number) {
    if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
      throw new BadRequestException('La latitud debe estar entre -90 y 90');
    }
    if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
      throw new BadRequestException('La longitud debe estar entre -180 y 180');
    }
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (await this.prisma.event.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  async findBySlug(slug: string) {
    const event = await this.prisma.event.findUnique({
      where: { slug },
      include: {
        configuration: true,
        images: { orderBy: { position: 'asc' } },
        ticketTypes: { where: { deletedAt: null }, orderBy: { price: 'asc' } },
        template: true,
      },
    });

    if (!event) {
      throw new NotFoundException('El evento no existe');
    }

    return {
      ...event,
      availability: await this.eventAvailabilityService.getAvailability(event.id),
    };
  }
}