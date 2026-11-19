import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProductCategoryDto } from './dto/create-product-categories.dto';
import { UpdateProductCategoryDto } from './dto/update-product-categories.dto';

@Injectable()
export class ProductCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.productCategory.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const category =
      await this.prisma.productCategory.findFirst({
        where: {
          id,
          isActive: true,
        },
      });

    if (!category) {
      throw new NotFoundException(
        'La categoría del producto no existe',
      );
    }

    return category;
  }

  async create(
    createProductCategoryDto: CreateProductCategoryDto,
  ) {
    const existingCategory =
      await this.prisma.productCategory.findUnique({
        where: {
          slug: createProductCategoryDto.slug,
        },
      });

    if (existingCategory) {
      throw new ConflictException(
        'Ya existe una categoría con ese slug',
      );
    }

    return this.prisma.productCategory.create({
      data: {
        name: createProductCategoryDto.name,
        slug: createProductCategoryDto.slug,
        description:
          createProductCategoryDto.description,
      },
    });
  }

  async update(
    id: number,
    updateProductCategoryDto: UpdateProductCategoryDto,
  ) {
    const category = await this.findOne(id);

    if (
      updateProductCategoryDto.slug !== undefined &&
      updateProductCategoryDto.slug !== category.slug
    ) {
      const existingCategory =
        await this.prisma.productCategory.findUnique({
          where: {
            slug: updateProductCategoryDto.slug,
          },
        });

      if (existingCategory) {
        throw new ConflictException(
          'Ya existe una categoría con ese slug',
        );
      }
    }

    return this.prisma.productCategory.update({
      where: {
        id,
      },
      data: {
        name: updateProductCategoryDto.name,
        slug: updateProductCategoryDto.slug,
        description:
          updateProductCategoryDto.description,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.productCategory.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });
  }
}