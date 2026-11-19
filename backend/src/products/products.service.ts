import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByEvent(eventId: number) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('El evento no existe');
    }

    return this.prisma.product.findMany({
      where: {
        eventId,
        isActive: true,
      },
      include: {
        category: true,
        variants: {
          where: {
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
        },
        images: true,
        options: {
          where: {
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
            { position: 'asc' },
            { id: 'asc' },
          ],
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        isActive: true,
      },
      include: {
        event: true,
        category: true,
        variants: {
          where: {
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
        },
        images: true,
        options: {
          where: {
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
            { position: 'asc' },
            { id: 'asc' },
          ],
        },
      },
    });

    if (!product) {
      throw new NotFoundException('El producto no existe');
    }

    return product;
  }

  async create(
    eventId: number,
    createProductDto: CreateProductDto,
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

    if (!event.configuration?.usesProducts) {
      throw new BadRequestException(
        'El evento no permite productos',
      );
    }

    const category = await this.prisma.productCategory.findUnique({
      where: {
        id: createProductDto.categoryId,
      },
    });

    if (!category || !category.isActive) {
      throw new NotFoundException(
        'La categoría del producto no existe',
      );
    }

    return this.prisma.product.create({
      data: {
        name: createProductDto.name,
        description: createProductDto.description,
        eventId,
        categoryId: createProductDto.categoryId,
      },
      include: {
        category: true,
      },
    });
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
  ) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException('El producto no existe');
    }

    if (updateProductDto.categoryId !== undefined) {
      const category =
        await this.prisma.productCategory.findUnique({
          where: {
            id: updateProductDto.categoryId,
          },
        });

      if (!category || !category.isActive) {
        throw new NotFoundException(
          'La categoría del producto no existe',
        );
      }
    }

    return this.prisma.product.update({
      where: {
        id,
      },
      data: {
        name: updateProductDto.name,
        description: updateProductDto.description,
        categoryId: updateProductDto.categoryId,
      },
      include: {
        category: true,
      },
    });
  }

  async remove(id: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException('El producto no existe');
    }

    return this.prisma.product.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });
  }
}