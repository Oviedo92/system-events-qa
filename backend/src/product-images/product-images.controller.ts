import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { ProductImagesService } from './product-images.service';
import { CreateProductImageDto } from './dto/create-product-images.dto';
import { UpdateProductImageDto } from './dto/update-product-images.dto';

@Controller()
export class ProductImagesController {
  constructor(
    private readonly productImagesService: ProductImagesService,
  ) {}

  @Get('products/:productId/images')
  findAllByProduct(
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.productImagesService.findAllByProduct(
      productId,
    );
  }

  @Post('products/:productId/images')
  create(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() createProductImageDto: CreateProductImageDto,
  ) {
    return this.productImagesService.create(
      productId,
      createProductImageDto,
    );
  }

  @Get('product-images/:id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productImagesService.findOne(id);
  }

  @Patch('product-images/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductImageDto: UpdateProductImageDto,
  ) {
    return this.productImagesService.update(
      id,
      updateProductImageDto,
    );
  }

  @Delete('product-images/:id')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productImagesService.remove(id);
  }
}