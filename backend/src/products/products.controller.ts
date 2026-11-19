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

import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller()
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
  ) {}

  @Get('events/:eventId/products')
  findAllByEvent(
    @Param('eventId', ParseIntPipe) eventId: number,
  ) {
    return this.productsService.findAllByEvent(eventId);
  }

  @Post('events/:eventId/products')
  create(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productsService.create(
      eventId,
      createProductDto,
    );
  }

  @Get('products/:id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.findOne(id);
  }

  @Patch('products/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(
      id,
      updateProductDto,
    );
  }

  @Delete('products/:id')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.remove(id);
  }
}