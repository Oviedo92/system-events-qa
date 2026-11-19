import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventAvailabilityService } from '../event-availability/event-availability.service';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService,
    private readonly eventAvailabilityService: EventAvailabilityService,

  ) { }

  async create(createEventDto: CreateEventDto) {
    const template = await this.prisma.eventTemplate.findUnique({
      where: {
        id: createEventDto.templateId,
      },
    });

    if (!template) {
      throw new NotFoundException(
        'La plantilla del evento no existe',
      );
    }

    const category = await this.prisma.eventCategory.findUnique({
      where: {
        id: createEventDto.categoryId,
      },
    });

    if (!category) {
      throw new NotFoundException(
        'La categoría del evento no existe',
      );
    }

    const startAt = new Date(createEventDto.startAt);
    const endAt = new Date(createEventDto.endAt);

    if (startAt >= endAt) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior a la fecha de finalización',
      );
    }

    this.validateCoordinates(
      createEventDto.latitude,
      createEventDto.longitude,
    );

    const slug = await this.generateUniqueSlug(
      createEventDto.name,
    );

    return this.prisma.event.create({
      data: {
        name: createEventDto.name,
        slug,
        description: createEventDto.description,

        startAt,
        endAt,

        venue: createEventDto.venue,
        address: createEventDto.address,
        city: createEventDto.city,

        latitude: createEventDto.latitude,
        longitude: createEventDto.longitude,

        capacity: createEventDto.capacity,
        status: 'DRAFT',

        templateId: createEventDto.templateId,
        categoryId: category.id,

        // Temporal mientras se implementa JWT.
        organizerId: 1,

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
      include: {
        configuration: true,
        category: true,
      },
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
          where: {
            deletedAt: null,
            status: 'ACTIVE',
          },
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
      throw new BadRequestException(
        'No se puede publicar un evento que ya finalizó',
      );
    }

    if (event.ticketTypes.length === 0) {
      throw new BadRequestException(
        'El evento necesita al menos un tipo de entrada activo',
      );
    }

    return this.prisma.event.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });
  }


  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    city?: string;
    from?: string;
    to?: string;
  } = {}) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 12);

    if (!Number.isInteger(page) || page < 1) {
      throw new BadRequestException(
        'page debe ser un entero mayor o igual a 1',
      );
    }

    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 48
    ) {
      throw new BadRequestException(
        'limit debe ser un entero entre 1 y 48',
      );
    }

    const search = query.search?.trim();
    const city = query.city?.trim();

    const startAtFilter: {
      gte?: Date;
      lte?: Date;
    } = {};

    if (query.from) {
      const from = new Date(query.from);

      if (Number.isNaN(from.getTime())) {
        throw new BadRequestException(
          'from debe ser una fecha válida',
        );
      }

      startAtFilter.gte = from;
    }

    if (query.to) {
      const to = new Date(query.to);

      if (Number.isNaN(to.getTime())) {
        throw new BadRequestException(
          'to debe ser una fecha válida',
        );
      }

      startAtFilter.lte = to;
    }

    if (
      startAtFilter.gte &&
      startAtFilter.lte &&
      startAtFilter.gte > startAtFilter.lte
    ) {
      throw new BadRequestException(
        'from no puede ser posterior a to',
      );
    }

    const where = {
      status: 'PUBLISHED',
      endAt: { gt: new Date() },
      ...(search
        ? {
          name: {
            contains: search,
            mode: 'insensitive' as const,
          },
        }
        : {}),
      ...(city && city.toLowerCase() !== 'todas'
        ? {
          city: {
            equals: city,
            mode: 'insensitive' as const,
          },
        }
        : {}),
      ...(Object.keys(startAtFilter).length > 0
        ? { startAt: startAtFilter }
        : {}),
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
            where: {
              deletedAt: null,
              status: 'ACTIVE',
            },
            select: {
              price: true,
            },
          },
        },
        orderBy: [
          { startAt: 'asc' },
          { id: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const data = await Promise.all(
      events.map(async ({ ticketTypes, ...event }) => ({
        ...event,
        minPrice:
          ticketTypes.length > 0
            ? Math.min(
              ...ticketTypes.map((ticket) =>
                Number(ticket.price),
              ),
            )
            : null,
        availability:
          await this.eventAvailabilityService.getAvailability(
            event.id,
          ),
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
      where: {
        id,
      },

      include: {
        configuration: true,

        images: {
          orderBy: {
            position: 'asc',
          },
        },

        ticketTypes: {
          where: {
            deletedAt: null,
          },

          orderBy: {
            price: 'asc',
          },
        },

        template: true,
      },
    });

    if (!event) {
      throw new NotFoundException(
        'El evento no existe',
      );
    }

    return event;
  }

  async update(
    id: number,
    updateEventDto: UpdateEventDto,
  ) {
    const event = await this.prisma.event.findUnique({
      where: {
        id,
      },
    });

    if (!event) {
      throw new NotFoundException(
        'El evento no existe',
      );
    }

    const startAt = updateEventDto.startAt
      ? new Date(updateEventDto.startAt)
      : event.startAt;

    const endAt = updateEventDto.endAt
      ? new Date(updateEventDto.endAt)
      : event.endAt;

    if (startAt >= endAt) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior a la fecha de finalización',
      );
    }

    this.validateCoordinates(
      updateEventDto.latitude,
      updateEventDto.longitude,
    );

    return this.prisma.event.update({
      where: {
        id,
      },

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

  private validateCoordinates(
    latitude?: number,
    longitude?: number,
  ) {
    if (
      latitude !== undefined &&
      (latitude < -90 || latitude > 90)
    ) {
      throw new BadRequestException(
        'La latitud debe estar entre -90 y 90',
      );
    }

    if (
      longitude !== undefined &&
      (longitude < -180 || longitude > 180)
    ) {
      throw new BadRequestException(
        'La longitud debe estar entre -180 y 180',
      );
    }
  }

  private async generateUniqueSlug(
    name: string,
  ): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (
      await this.prisma.event.findUnique({
        where: {
          slug,
        },
      })
    ) {
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
        images: {
          orderBy: { position: 'asc' },
        },
        ticketTypes: {
          where: { deletedAt: null },
          orderBy: { price: 'asc' },
        },
        template: true,
      },
    });

    if (!event) {
      throw new NotFoundException('El evento no existe');
    }

    return {
      ...event,
      availability:
        await this.eventAvailabilityService.getAvailability(event.id),
    };
  }
}