import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProductVariantDto } from './dto/create-product-variants.dto';
import { UpdateProductVariantDto } from './dto/update-product-variants.dto';

@Injectable()
export class ProductVariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByProduct(productId: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException('El producto no existe');
    }

    return this.prisma.productVariant.findMany({
      where: {
        productId,
        isActive: true,
      },
      include: {
        optionValues: {
          include: {
            optionValue: {
              include: {
                option: true,
              },
            },
          },
        },
      },
      orderBy: {
        id: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id,
        isActive: true,
      },
      include: {
        product: true,
        optionValues: {
          include: {
            optionValue: {
              include: {
                option: true,
              },
            },
          },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException(
        'La variante del producto no existe',
      );
    }

    return variant;
  }

  async create(
    productId: number,
    createProductVariantDto: CreateProductVariantDto,
  ) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException('El producto no existe');
    }

    await this.validateOptionValueIds(
      productId,
      createProductVariantDto.optionValueIds,
    );

    try {
      return await this.prisma.productVariant.create({
        data: {
          sku: createProductVariantDto.sku,
          price: createProductVariantDto.price,
          quantity: createProductVariantDto.quantity,
          available: createProductVariantDto.quantity,
          productId,

          optionValues: {
            create: createProductVariantDto.optionValueIds.map(
              (optionValueId) => ({
                optionValue: {
                  connect: {
                    id: optionValueId,
                  },
                },
              }),
            ),
          },
        },
        include: {
          optionValues: {
            include: {
              optionValue: {
                include: {
                  option: true,
                },
              },
            },
          },
        },
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'El SKU ya existe',
        );
      }

      throw error;
    }
  }

  async update(
    id: number,
    updateProductVariantDto: UpdateProductVariantDto,
  ) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id,
        isActive: true,
      },
    });

    if (!variant) {
      throw new NotFoundException(
        'La variante del producto no existe',
      );
    }

    if (
      updateProductVariantDto.optionValueIds !== undefined
    ) {
      await this.validateOptionValueIds(
        variant.productId,
        updateProductVariantDto.optionValueIds,
      );
    }

    const newQuantity =
      updateProductVariantDto.quantity ??
      variant.quantity;

    const committed =
      variant.quantity - variant.available;

    if (newQuantity < committed) {
      throw new BadRequestException(
        'La cantidad no puede ser menor que las unidades comprometidas',
      );
    }

    const newAvailable =
      newQuantity - committed;

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.productVariant.update({
          where: {
            id,
          },
          data: {
            sku: updateProductVariantDto.sku,
            price: updateProductVariantDto.price,
            quantity: newQuantity,
            available: newAvailable,
          },
        });

        if (
          updateProductVariantDto.optionValueIds !== undefined
        ) {
          await tx.productVariantOptionValue.deleteMany({
            where: {
              variantId: id,
            },
          });

          if (
            updateProductVariantDto.optionValueIds.length > 0
          ) {
            await tx.productVariantOptionValue.createMany({
              data: updateProductVariantDto.optionValueIds.map(
                (optionValueId) => ({
                  variantId: id,
                  optionValueId,
                }),
              ),
            });
          }
        }

        return tx.productVariant.findUnique({
          where: {
            id,
          },
          include: {
            optionValues: {
              include: {
                optionValue: {
                  include: {
                    option: true,
                  },
                },
              },
            },
          },
        });
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'El SKU ya existe',
        );
      }

      throw error;
    }
  }

  async remove(id: number) {
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id,
        isActive: true,
      },
    });

    if (!variant) {
      throw new NotFoundException(
        'La variante del producto no existe',
      );
    }

    return this.prisma.productVariant.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });
  }

  private async validateOptionValueIds(
    productId: number,
    optionValueIds: number[],
  ) {
    if (optionValueIds.length === 0) {
      return;
    }

    const uniqueOptionValueIds = [
      ...new Set(optionValueIds),
    ];

    if (
      uniqueOptionValueIds.length !==
      optionValueIds.length
    ) {
      throw new BadRequestException(
        'No se pueden repetir valores de opción',
      );
    }

    const optionValues =
      await this.prisma.productOptionValue.findMany({
        where: {
          id: {
            in: uniqueOptionValueIds,
          },
          isActive: true,
          option: {
            productId,
            isActive: true,
          },
        },
        include: {
          option: true,
        },
      });

    if (
      optionValues.length !==
      uniqueOptionValueIds.length
    ) {
      throw new BadRequestException(
        'Uno o más valores de opción no pertenecen al producto',
      );
    }

    const optionIds = optionValues.map(
      (optionValue) => optionValue.optionId,
    );

    const uniqueOptionIds = [...new Set(optionIds)];

    if (
      uniqueOptionIds.length !==
      optionIds.length
    ) {
      throw new BadRequestException(
        'Una variante no puede tener más de un valor de la misma opción',
      );
    }
  }
}