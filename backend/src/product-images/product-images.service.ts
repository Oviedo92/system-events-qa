import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProductImageDto } from './dto/create-product-images.dto';
import { UpdateProductImageDto } from './dto/update-product-images.dto';

@Injectable()
export class ProductImagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByProduct(productId: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        'El producto no existe',
      );
    }

    return this.prisma.productImage.findMany({
      where: {
        productId,
      },
      orderBy: [
        { position: 'asc' },
        { id: 'asc' },
      ],
    });
  }

  async findOne(id: number) {
    const image =
      await this.prisma.productImage.findUnique({
        where: {
          id,
        },
        include: {
          product: true,
        },
      });

    if (!image) {
      throw new NotFoundException(
        'La imagen del producto no existe',
      );
    }

    return image;
  }

  async create(
    productId: number,
    createProductImageDto: CreateProductImageDto,
  ) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        'El producto no existe',
      );
    }

    return this.prisma.productImage.create({
      data: {
        url: createProductImageDto.url,
        publicId: createProductImageDto.publicId,
        altText: createProductImageDto.altText,
        position:
          createProductImageDto.position ?? 0,
        productId,
      },
    });
  }

  async update(
    id: number,
    updateProductImageDto: UpdateProductImageDto,
  ) {
    await this.findOne(id);

    return this.prisma.productImage.update({
      where: {
        id,
      },
      data: {
        url: updateProductImageDto.url,
        publicId: updateProductImageDto.publicId,
        altText: updateProductImageDto.altText,
        position: updateProductImageDto.position,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.productImage.delete({
      where: {
        id,
      },
    });
  }
}