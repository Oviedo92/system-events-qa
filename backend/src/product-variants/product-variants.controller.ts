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

import { ProductVariantsService } from './product-variants.service';
import { CreateProductVariantDto } from './dto/create-product-variants.dto';
import { UpdateProductVariantDto } from './dto/update-product-variants.dto';

@Controller()
export class ProductVariantsController {
  constructor(
    private readonly productVariantsService: ProductVariantsService,
  ) {}

  @Get('products/:productId/variants')
  findAllByProduct(
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.productVariantsService.findAllByProduct(
      productId,
    );
  }

  @Post('products/:productId/variants')
  create(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() createProductVariantDto: CreateProductVariantDto,
  ) {
    return this.productVariantsService.create(
      productId,
      createProductVariantDto,
    );
  }

  @Get('product-variants/:id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productVariantsService.findOne(id);
  }

  @Patch('product-variants/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductVariantDto: UpdateProductVariantDto,
  ) {
    return this.productVariantsService.update(
      id,
      updateProductVariantDto,
    );
  }

  @Delete('product-variants/:id')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productVariantsService.remove(id);
  }
}