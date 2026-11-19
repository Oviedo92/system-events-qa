import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateProductOptionDto } from './dto/create-product-option.dto';
import { UpdateProductOptionDto } from './dto/update-product-option.dto';
import { CreateProductOptionValueDto } from './dto/create-product-option-value.dto';
import { UpdateProductOptionValueDto } from './dto/update-product-option-value.dto';

@Injectable()
export class ProductOptionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // PRODUCT OPTIONS
  // ============================================================

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

    return this.prisma.productOption.findMany({
      where: {
        productId,
        isActive: true,
      },
      include: {
        values: {
          where: {
            isActive: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
      orderBy: [
        {
          position: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });
  }

  async findOne(id: number) {
    const option = await this.prisma.productOption.findFirst({
      where: {
        id,
        isActive: true,
      },
      include: {
        product: true,
        values: {
          where: {
            isActive: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
    });

    if (!option) {
      throw new NotFoundException(
        'La opción del producto no existe',
      );
    }

    return option;
  }

  async create(
    productId: number,
    createProductOptionDto: CreateProductOptionDto,
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

    const existingOption =
      await this.prisma.productOption.findFirst({
        where: {
          productId,
          name: createProductOptionDto.name,
          isActive: true,
        },
      });

    if (existingOption) {
      throw new ConflictException(
        'La opción ya existe para este producto',
      );
    }

    return this.prisma.productOption.create({
      data: {
        name: createProductOptionDto.name,
        position: createProductOptionDto.position ?? 0,
        productId,
      },
      include: {
        values: true,
      },
    });
  }

  async update(
    id: number,
    updateProductOptionDto: UpdateProductOptionDto,
  ) {
    const option = await this.prisma.productOption.findFirst({
      where: {
        id,
        isActive: true,
      },
    });

    if (!option) {
      throw new NotFoundException(
        'La opción del producto no existe',
      );
    }

    if (
      updateProductOptionDto.name !== undefined &&
      updateProductOptionDto.name !== option.name
    ) {
      const existingOption =
        await this.prisma.productOption.findFirst({
          where: {
            productId: option.productId,
            name: updateProductOptionDto.name,
            isActive: true,
            NOT: {
              id,
            },
          },
        });

      if (existingOption) {
        throw new ConflictException(
          'La opción ya existe para este producto',
        );
      }
    }

    return this.prisma.productOption.update({
      where: {
        id,
      },
      data: {
        name: updateProductOptionDto.name,
        position: updateProductOptionDto.position,
      },
      include: {
        values: {
          where: {
            isActive: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
    });
  }

  async remove(id: number) {
    const option = await this.prisma.productOption.findFirst({
      where: {
        id,
        isActive: true,
      },
      include: {
        values: {
          where: {
            isActive: true,
          },
        },
      },
    });

    if (!option) {
      throw new NotFoundException(
        'La opción del producto no existe',
      );
    }

    const valueUsedByVariant =
      await this.prisma.productOptionValue.findFirst({
        where: {
          optionId: id,
          isActive: true,
          variants: {
            some: {},
          },
        },
      });

    if (valueUsedByVariant) {
      throw new ConflictException(
        'No se puede eliminar la opción porque uno de sus valores está asociado a una variante',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.productOptionValue.updateMany({
        where: {
          optionId: id,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });

      return tx.productOption.update({
        where: {
          id,
        },
        data: {
          isActive: false,
        },
      });
    });
  }

  // ============================================================
  // PRODUCT OPTION VALUES
  // ============================================================

  async findAllValues(optionId: number) {
    const option = await this.prisma.productOption.findFirst({
      where: {
        id: optionId,
        isActive: true,
      },
    });

    if (!option) {
      throw new NotFoundException(
        'La opción del producto no existe',
      );
    }

    return this.prisma.productOptionValue.findMany({
      where: {
        optionId,
        isActive: true,
      },
      orderBy: [
        {
          position: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });
  }

  async findOneValue(id: number) {
    const value =
      await this.prisma.productOptionValue.findFirst({
        where: {
          id,
          isActive: true,
        },
        include: {
          option: true,
        },
      });

    if (!value) {
      throw new NotFoundException(
        'El valor de la opción no existe',
      );
    }

    return value;
  }

  async createValue(
    optionId: number,
    createProductOptionValueDto: CreateProductOptionValueDto,
  ) {
    const option = await this.prisma.productOption.findFirst({
      where: {
        id: optionId,
        isActive: true,
      },
    });

    if (!option) {
      throw new NotFoundException(
        'La opción del producto no existe',
      );
    }

    const existingValue =
      await this.prisma.productOptionValue.findFirst({
        where: {
          optionId,
          value: createProductOptionValueDto.value,
          isActive: true,
        },
      });

    if (existingValue) {
      throw new ConflictException(
        'El valor ya existe para esta opción',
      );
    }

    return this.prisma.productOptionValue.create({
      data: {
        value: createProductOptionValueDto.value,
        position:
          createProductOptionValueDto.position ?? 0,
        optionId,
      },
    });
  }

  async updateValue(
    id: number,
    updateProductOptionValueDto: UpdateProductOptionValueDto,
  ) {
    const value =
      await this.prisma.productOptionValue.findFirst({
        where: {
          id,
          isActive: true,
        },
      });

    if (!value) {
      throw new NotFoundException(
        'El valor de la opción no existe',
      );
    }

    if (
      updateProductOptionValueDto.value !== undefined &&
      updateProductOptionValueDto.value !== value.value
    ) {
      const existingValue =
        await this.prisma.productOptionValue.findFirst({
          where: {
            optionId: value.optionId,
            value: updateProductOptionValueDto.value,
            isActive: true,
            NOT: {
              id,
            },
          },
        });

      if (existingValue) {
        throw new ConflictException(
          'El valor ya existe para esta opción',
        );
      }
    }

    return this.prisma.productOptionValue.update({
      where: {
        id,
      },
      data: {
        value: updateProductOptionValueDto.value,
        position: updateProductOptionValueDto.position,
      },
    });
  }

  async removeValue(id: number) {
    const value =
      await this.prisma.productOptionValue.findFirst({
        where: {
          id,
          isActive: true,
        },
      });

    if (!value) {
      throw new NotFoundException(
        'El valor de la opción no existe',
      );
    }

    const usedByVariant =
      await this.prisma.productVariantOptionValue.findFirst({
        where: {
          optionValueId: id,
        },
      });

    if (usedByVariant) {
      throw new ConflictException(
        'No se puede eliminar el valor porque está asociado a una variante',
      );
    }

    return this.prisma.productOptionValue.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });
  }
}