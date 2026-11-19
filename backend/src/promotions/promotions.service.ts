import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotions.dto';
import { UpdatePromotionDto } from './dto/update-promotions.dto';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByEvent(eventId: number) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('El evento no existe');
    }

    return this.prisma.promotion.findMany({
      where: { eventId },
      include: {
        ticketTypes: {
          include: {
            ticketType: true,
          },
        },
        products: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
      include: {
        event: true,
        ticketTypes: {
          include: {
            ticketType: true,
          },
        },
        products: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!promotion) {
      throw new NotFoundException('La promoción no existe');
    }

    return promotion;
  }

  async create(
    eventId: number,
    createPromotionDto: CreatePromotionDto,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        configuration: true,
      },
    });

    if (!event) {
      throw new NotFoundException('El evento no existe');
    }

    if (!event.configuration?.usesPromotions) {
      throw new BadRequestException(
        'El evento no permite promociones',
      );
    }

    this.validateDates(
      createPromotionDto.startsAt,
      createPromotionDto.endsAt,
    );

    const appliesToAll =
      createPromotionDto.appliesToAll ?? false;

    const ticketTypeIds =
      createPromotionDto.ticketTypeIds ?? [];

    const productIds =
      createPromotionDto.productIds ?? [];

    this.validateScope(
      appliesToAll,
      ticketTypeIds,
      productIds,
    );

    await this.validateTicketTypes(
      eventId,
      ticketTypeIds,
    );

    await this.validateProducts(
      eventId,
      productIds,
    );

    return this.prisma.promotion.create({
      data: {
        name: createPromotionDto.name,
        description: createPromotionDto.description,
        code: createPromotionDto.code,
        type: createPromotionDto.type,
        value: createPromotionDto.value,
        minSubtotal: createPromotionDto.minSubtotal,

        startsAt: createPromotionDto.startsAt
          ? new Date(createPromotionDto.startsAt)
          : undefined,

        endsAt: createPromotionDto.endsAt
          ? new Date(createPromotionDto.endsAt)
          : undefined,

        maxUses: createPromotionDto.maxUses,
        isActive: createPromotionDto.isActive ?? true,
        appliesToAll,

        eventId,

        ticketTypes: appliesToAll
          ? undefined
          : {
              create: ticketTypeIds.map((ticketTypeId) => ({
                ticketTypeId,
              })),
            },

        products: appliesToAll
          ? undefined
          : {
              create: productIds.map((productId) => ({
                productId,
              })),
            },
      },

      include: {
        ticketTypes: {
          include: {
            ticketType: true,
          },
        },
        products: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async update(
    id: number,
    updatePromotionDto: UpdatePromotionDto,
  ) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
    });

    if (!promotion) {
      throw new NotFoundException('La promoción no existe');
    }

    this.validateDates(
      updatePromotionDto.startsAt,
      updatePromotionDto.endsAt,
    );

    const hasScopeUpdate =
      updatePromotionDto.appliesToAll !== undefined ||
      updatePromotionDto.ticketTypeIds !== undefined ||
      updatePromotionDto.productIds !== undefined;

    if (!hasScopeUpdate) {
      return this.prisma.promotion.update({
        where: { id },
        data: {
          name: updatePromotionDto.name,
          description: updatePromotionDto.description,
          code: updatePromotionDto.code,
          type: updatePromotionDto.type,
          value: updatePromotionDto.value,
          minSubtotal: updatePromotionDto.minSubtotal,

          startsAt: updatePromotionDto.startsAt
            ? new Date(updatePromotionDto.startsAt)
            : undefined,

          endsAt: updatePromotionDto.endsAt
            ? new Date(updatePromotionDto.endsAt)
            : undefined,

          maxUses: updatePromotionDto.maxUses,
          isActive: updatePromotionDto.isActive,
        },
      });
    }

    const appliesToAll =
      updatePromotionDto.appliesToAll ??
      promotion.appliesToAll;

    const ticketTypeIds =
      updatePromotionDto.ticketTypeIds ?? [];

    const productIds =
      updatePromotionDto.productIds ?? [];

    this.validateScope(
      appliesToAll,
      ticketTypeIds,
      productIds,
    );

    await this.validateTicketTypes(
      promotion.eventId,
      ticketTypeIds,
    );

    await this.validateProducts(
      promotion.eventId,
      productIds,
    );

    return this.prisma.$transaction(async (tx) => {
      await tx.promotionTicketType.deleteMany({
        where: {
          promotionId: id,
        },
      });

      await tx.promotionProduct.deleteMany({
        where: {
          promotionId: id,
        },
      });

      return tx.promotion.update({
        where: { id },
        data: {
          name: updatePromotionDto.name,
          description: updatePromotionDto.description,
          code: updatePromotionDto.code,
          type: updatePromotionDto.type,
          value: updatePromotionDto.value,
          minSubtotal: updatePromotionDto.minSubtotal,

          startsAt: updatePromotionDto.startsAt
            ? new Date(updatePromotionDto.startsAt)
            : undefined,

          endsAt: updatePromotionDto.endsAt
            ? new Date(updatePromotionDto.endsAt)
            : undefined,

          maxUses: updatePromotionDto.maxUses,
          isActive: updatePromotionDto.isActive,
          appliesToAll,

          ticketTypes: appliesToAll
            ? undefined
            : {
                create: ticketTypeIds.map((ticketTypeId) => ({
                  ticketTypeId,
                })),
              },

          products: appliesToAll
            ? undefined
            : {
                create: productIds.map((productId) => ({
                  productId,
                })),
              },
        },

        include: {
          ticketTypes: {
            include: {
              ticketType: true,
            },
          },
          products: {
            include: {
              product: true,
            },
          },
        },
      });
    });
  }

  async remove(id: number) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
    });

    if (!promotion) {
      throw new NotFoundException('La promoción no existe');
    }

    return this.prisma.promotion.delete({
      where: { id },
    });
  }

  private validateDates(
    startsAt?: string,
    endsAt?: string,
  ) {
    if (
      startsAt &&
      endsAt &&
      new Date(startsAt) >= new Date(endsAt)
    ) {
      throw new BadRequestException(
        'La fecha de inicio debe ser anterior a la fecha de finalización',
      );
    }
  }

  private validateScope(
    appliesToAll: boolean,
    ticketTypeIds: number[],
    productIds: number[],
  ) {
    if (
      appliesToAll &&
      (ticketTypeIds.length > 0 ||
        productIds.length > 0)
    ) {
      throw new BadRequestException(
        'Una promoción global no puede tener productos o tipos de entrada específicos',
      );
    }

    if (
      !appliesToAll &&
      ticketTypeIds.length === 0 &&
      productIds.length === 0
    ) {
      throw new BadRequestException(
        'Una promoción específica debe indicar al menos un producto o tipo de entrada',
      );
    }
  }

  private async validateTicketTypes(
    eventId: number,
    ticketTypeIds: number[],
  ) {
    for (const ticketTypeId of ticketTypeIds) {
      const ticketType =
        await this.prisma.ticketType.findFirst({
          where: {
            id: ticketTypeId,
            eventId,
          },
        });

      if (!ticketType) {
        throw new NotFoundException(
          `El tipo de entrada ${ticketTypeId} no pertenece al evento`,
        );
      }
    }
  }

  private async validateProducts(
    eventId: number,
    productIds: number[],
  ) {
    for (const productId of productIds) {
      const product =
        await this.prisma.product.findFirst({
          where: {
            id: productId,
            eventId,
          },
        });

      if (!product) {
        throw new NotFoundException(
          `El producto ${productId} no pertenece al evento`,
        );
      }
    }
  }
}