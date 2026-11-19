import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateCartDto } from './dto/create-carts.dto';
import { UpdateCartDto } from './dto/update-carts.dto';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartsService {
  constructor(private readonly prisma: PrismaService) { }

  async findAllByUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('El usuario no existe');
    }

    return this.prisma.cart.findMany({
      where: { userId },
      include: {
        event: true,
        promotion: true,
        items: {
          include: {
            ticketType: true,
            productVariant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { id },
      include: {
        user: true,
        event: true,
        promotion: true,
        items: {
          include: {
            ticketType: true,
            productVariant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('El carrito no existe');
    }

    return cart;
  }

  async create(
    userId: number,
    createCartDto: CreateCartDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('El usuario no existe');
    }

    const event = await this.prisma.event.findUnique({
      where: { id: createCartDto.eventId },
    });

    if (!event) {
      throw new NotFoundException('El evento no existe');
    }

    return this.prisma.cart.create({
      data: {
        userId,
        eventId: createCartDto.eventId,
        status: 'ACTIVE',
      },
      include: {
        event: true,
        items: true,
      },
    });
  }

  async update(
    id: number,
    updateCartDto: UpdateCartDto,
  ) {
    const cart = await this.prisma.cart.findUnique({
      where: { id },
    });

    if (!cart) {
      throw new NotFoundException('El carrito no existe');
    }

    this.ensureCartIsActive(cart.status);

    if (updateCartDto.promotionId !== undefined) {
      const promotion =
        await this.prisma.promotion.findFirst({
          where: {
            id: updateCartDto.promotionId,
            eventId: cart.eventId,
          },
        });

      if (!promotion) {
        throw new NotFoundException(
          'La promoción no existe o no pertenece al evento del carrito',
        );
      }

      this.validatePromotion(promotion);
    }

    await this.prisma.cart.update({
      where: { id },
      data: {
        promotionId: updateCartDto.promotionId,
      },
    });

    return this.recalculateCart(id);
  }

  async remove(id: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { id },
    });

    if (!cart) {
      throw new NotFoundException('El carrito no existe');
    }

    this.ensureCartIsActive(cart.status);

    return this.prisma.cart.delete({
      where: { id },
    });
  }

  async addItem(
    cartId: number,
    createCartItemDto: CreateCartItemDto,
  ) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
    });

    if (!cart) {
      throw new NotFoundException('El carrito no existe');
    }

    this.ensureCartIsActive(cart.status);

    const {
      ticketTypeId,
      productVariantId,
      quantity,
    } = createCartItemDto;

    const hasTicketType = ticketTypeId !== undefined;
    const hasProductVariant =
      productVariantId !== undefined;

    if (
      (hasTicketType && hasProductVariant) ||
      (!hasTicketType && !hasProductVariant)
    ) {
      throw new BadRequestException(
        'Debe indicar un TicketType o un ProductVariant, pero no ambos',
      );
    }

    let unitPrice: number;

    if (hasTicketType) {
      const ticketType =
        await this.prisma.ticketType.findFirst({
          where: {
            id: ticketTypeId,
            eventId: cart.eventId,
            deletedAt: null,
          },
        });

      if (!ticketType) {
        throw new NotFoundException(
          'El TicketType no existe o no pertenece al evento del carrito',
        );
      }

      if (ticketType.status !== 'ACTIVE') {
        throw new BadRequestException(
          'El TicketType no está activo',
        );
      }

      this.validateSaleWindow(
        ticketType.startSaleAt,
        ticketType.endSaleAt,
      );

      if (ticketType.available < quantity) {
        throw new BadRequestException(
          'No hay suficientes entradas disponibles',
        );
      }

      unitPrice = Number(ticketType.price);
    } else {
      const productVariant =
        await this.prisma.productVariant.findUnique({
          where: {
            id: productVariantId,
          },
          include: {
            product: true,
          },
        });

      if (!productVariant) {
        throw new NotFoundException(
          'La variante de producto no existe',
        );
      }

      if (productVariant.product.eventId !== cart.eventId) {
        throw new BadRequestException(
          'La variante no pertenece al evento del carrito',
        );
      }

      if (!productVariant.isActive) {
        throw new BadRequestException(
          'La variante del producto no está activa',
        );
      }

      if (!productVariant.product.isActive) {
        throw new BadRequestException(
          'El producto no está activo',
        );
      }

      if (productVariant.available < quantity) {
        throw new BadRequestException(
          'No hay suficiente stock disponible',
        );
      }

      unitPrice = Number(productVariant.price);
    }

    const subtotal = unitPrice * quantity;

    try {
      await this.prisma.cartItem.create({
        data: {
          cartId,
          ticketTypeId,
          productVariantId,
          quantity,
          unitPrice,
          subtotal,
        },
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Unique constraint')
      ) {
        throw new BadRequestException(
          'El artículo ya existe en el carrito',
        );
      }

      throw error;
    }

    return this.recalculateCart(cartId);
  }

  async updateItem(
    id: number,
    updateCartItemDto: UpdateCartItemDto,
  ) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id },
      include: {
        cart: true,
        ticketType: true,
        productVariant: true,
      },
    });

    if (!item) {
      throw new NotFoundException(
        'El item del carrito no existe',
      );
    }

    this.ensureCartIsActive(item.cart.status);

    const quantity = updateCartItemDto.quantity;

    let unitPrice: number;

    if (item.ticketType) {
      if (item.ticketType.deletedAt !== null) {
        throw new BadRequestException(
          'El TicketType ya no está disponible',
        );
      }

      if (item.ticketType.status !== 'ACTIVE') {
        throw new BadRequestException(
          'El TicketType no está activo',
        );
      }

      this.validateSaleWindow(
        item.ticketType.startSaleAt,
        item.ticketType.endSaleAt,
      );

      if (item.ticketType.available < quantity) {
        throw new BadRequestException(
          'No hay suficientes entradas disponibles',
        );
      }

      unitPrice = Number(item.ticketType.price);
    } else if (item.productVariant) {
      if (!item.productVariant.isActive) {
        throw new BadRequestException(
          'La variante del producto no está activa',
        );
      }

      if (item.productVariant.available < quantity) {
        throw new BadRequestException(
          'No hay suficiente stock disponible',
        );
      }

      unitPrice = Number(item.productVariant.price);
    } else {
      throw new BadRequestException(
        'El item no tiene un producto o TicketType válido',
      );
    }

    const subtotal = unitPrice * quantity;

    await this.prisma.cartItem.update({
      where: { id },
      data: {
        quantity,
        unitPrice,
        subtotal,
      },
    });

    return this.recalculateCart(item.cartId);
  }

  async removeItem(id: number) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id },
      include: {
        cart: true,
      },
    });

    if (!item) {
      throw new NotFoundException(
        'El item del carrito no existe',
      );
    }

    this.ensureCartIsActive(item.cart.status);

    await this.prisma.cartItem.delete({
      where: { id },
    });

    return this.recalculateCart(item.cartId);
  }

  private async recalculateCart(cartId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        promotion: {
          include: {
            ticketTypes: true,
            products: true,
          },
        },
        items: {
          include: {
            ticketType: true,
            productVariant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('El carrito no existe');
    }

    const subtotal = cart.items.reduce(
      (sum, item) => sum + Number(item.subtotal),
      0,
    );

    let discount = 0;

    const promotion = cart.promotion;

    if (promotion) {
      const now = new Date();

      const startsValid =
        !promotion.startsAt ||
        now >= promotion.startsAt;

      const endsValid =
        !promotion.endsAt ||
        now <= promotion.endsAt;

      const minSubtotalValid =
        !promotion.minSubtotal ||
        subtotal >= Number(promotion.minSubtotal);

      const maxUsesValid =
        promotion.maxUses === null ||
        promotion.currentUses < promotion.maxUses;

      if (
        promotion.isActive &&
        startsValid &&
        endsValid &&
        minSubtotalValid &&
        maxUsesValid
      ) {
        let eligibleSubtotal = 0;

        for (const item of cart.items) {
          let applies = false;

          if (promotion.appliesToAll) {
            applies = true;
          } else {
            if (
              item.ticketTypeId &&
              promotion.ticketTypes.some(
                (relation) =>
                  relation.ticketTypeId ===
                  item.ticketTypeId,
              )
            ) {
              applies = true;
            }

            if (
              item.productVariant?.productId &&
              promotion.products.some(
                (relation) =>
                  relation.productId ===
                  item.productVariant!.productId,
              )
            ) {
              applies = true;
            }
          }

          if (applies) {
            eligibleSubtotal += Number(item.subtotal);
          }
        }

        if (promotion.type === 'PERCENTAGE') {
          discount =
            eligibleSubtotal *
            (Number(promotion.value) / 100);
        }

        if (promotion.type === 'FIXED') {
          discount = Math.min(
            Number(promotion.value),
            eligibleSubtotal,
          );
        }

        discount = Math.min(discount, subtotal);
      }
    }

    const total = subtotal - discount;

    return this.prisma.cart.update({
      where: { id: cartId },
      data: {
        subtotal,
        discount,
        total,
      },
      include: {
        event: true,
        promotion: true,
        items: {
          include: {
            ticketType: true,
            productVariant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });
  }

  private ensureCartIsActive(status: string) {
    if (status !== 'ACTIVE') {
      throw new BadRequestException(
        'El carrito no está activo',
      );
    }
  }

  private validateSaleWindow(
    startSaleAt: Date | null,
    endSaleAt: Date | null,
  ) {
    const now = new Date();

    if (startSaleAt && now < startSaleAt) {
      throw new BadRequestException(
        'La venta de este TicketType aún no ha comenzado',
      );
    }

    if (endSaleAt && now > endSaleAt) {
      throw new BadRequestException(
        'La venta de este TicketType ya ha finalizado',
      );
    }
  }

  private validatePromotion(promotion: {
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
    maxUses: number | null;
    currentUses: number;
  }) {
    if (!promotion.isActive) {
      throw new BadRequestException(
        'La promoción no está activa',
      );
    }

    const now = new Date();

    if (
      promotion.startsAt &&
      now < promotion.startsAt
    ) {
      throw new BadRequestException(
        'La promoción aún no ha comenzado',
      );
    }

    if (
      promotion.endsAt &&
      now > promotion.endsAt
    ) {
      throw new BadRequestException(
        'La promoción ya ha finalizado',
      );
    }

    if (
      promotion.maxUses !== null &&
      promotion.currentUses >= promotion.maxUses
    ) {
      throw new BadRequestException(
        'La promoción ha alcanzado el límite de usos',
      );
    }
  }


  private async assertCartOwner(cartId: number, userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      select: { id: true, userId: true },
    });

    if (!cart) {
      throw new NotFoundException('El carrito no existe');
    }

    if (cart.userId !== userId) {
      throw new ForbiddenException('No puedes acceder al carrito de otro usuario');
    }
  }

  async findOneForUser(id: number, userId: number) {
    await this.assertCartOwner(id, userId);
    return this.findOne(id);
  }

  async updateForUser(id: number, userId: number, dto: UpdateCartDto) {
    await this.assertCartOwner(id, userId);
    return this.update(id, dto);
  }

  async removeForUser(id: number, userId: number) {
    await this.assertCartOwner(id, userId);
    return this.remove(id);
  }

  async addItemForUser(
    cartId: number,
    userId: number,
    dto: CreateCartItemDto,
  ) {
    await this.assertCartOwner(cartId, userId);
    return this.addItem(cartId, dto);
  }

  async updateItemForUser(
    itemId: number,
    userId: number,
    dto: UpdateCartItemDto,
  ) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      select: { cart: { select: { userId: true } } },
    });

    if (!item) {
      throw new NotFoundException('El item del carrito no existe');
    }

    if (item.cart.userId !== userId) {
      throw new ForbiddenException('No puedes modificar el carrito de otro usuario');
    }

    return this.updateItem(itemId, dto);
  }

  async removeItemForUser(itemId: number, userId: number) {
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      select: { cart: { select: { userId: true } } },
    });

    if (!item) {
      throw new NotFoundException('El item del carrito no existe');
    }

    if (item.cart.userId !== userId) {
      throw new ForbiddenException('No puedes modificar el carrito de otro usuario');
    }

    return this.removeItem(itemId);
  }

}