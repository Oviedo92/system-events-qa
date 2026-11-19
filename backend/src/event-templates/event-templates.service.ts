import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateEventTemplateDto } from './dto/create-event-template.dto';
import { UpdateEventTemplateDto } from './dto/update-event-template.dto';

@Injectable()
export class EventTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEventTemplateDto: CreateEventTemplateDto) {
    return this.prisma.eventTemplate.create({
      data: {
        name: createEventTemplateDto.name,
        description: createEventTemplateDto.description,

        usesZones: createEventTemplateDto.usesZones,
        usesSeats: createEventTemplateDto.usesSeats,
        usesProducts: createEventTemplateDto.usesProducts,
        usesPromotions: createEventTemplateDto.usesPromotions,
        usesQr: createEventTemplateDto.usesQr,
      },
    });
  }

  async findAll() {
    return this.prisma.eventTemplate.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const eventTemplate = await this.prisma.eventTemplate.findUnique({
      where: {
        id,
      },
    });

    if (!eventTemplate) {
      throw new NotFoundException(
        'La plantilla del evento no existe',
      );
    }

    return eventTemplate;
  }

  async update(
    id: number,
    updateEventTemplateDto: UpdateEventTemplateDto,
  ) {
    await this.findOne(id);

    return this.prisma.eventTemplate.update({
      where: {
        id,
      },
      data: {
        name: updateEventTemplateDto.name,
        description: updateEventTemplateDto.description,

        usesZones: updateEventTemplateDto.usesZones,
        usesSeats: updateEventTemplateDto.usesSeats,
        usesProducts: updateEventTemplateDto.usesProducts,
        usesPromotions: updateEventTemplateDto.usesPromotions,
        usesQr: updateEventTemplateDto.usesQr,
      },
    });
  }
}