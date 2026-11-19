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

import { ProductOptionsService } from './product-options.service';

import { CreateProductOptionDto } from './dto/create-product-option.dto';
import { UpdateProductOptionDto } from './dto/update-product-option.dto';
import { CreateProductOptionValueDto } from './dto/create-product-option-value.dto';
import { UpdateProductOptionValueDto } from './dto/update-product-option-value.dto';

@Controller()
export class ProductOptionsController {
  constructor(
    private readonly productOptionsService: ProductOptionsService,
  ) {}

  // ============================================================
  // PRODUCT OPTIONS
  // ============================================================

  @Get('products/:productId/options')
  findAllByProduct(
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.productOptionsService.findAllByProduct(
      productId,
    );
  }

  @Post('products/:productId/options')
  create(
    @Param('productId', ParseIntPipe) productId: number,
    @Body() createProductOptionDto: CreateProductOptionDto,
  ) {
    return this.productOptionsService.create(
      productId,
      createProductOptionDto,
    );
  }

  @Get('product-options/:id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productOptionsService.findOne(id);
  }

  @Patch('product-options/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductOptionDto: UpdateProductOptionDto,
  ) {
    return this.productOptionsService.update(
      id,
      updateProductOptionDto,
    );
  }

  @Delete('product-options/:id')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productOptionsService.remove(id);
  }

  // ============================================================
  // PRODUCT OPTION VALUES
  // ============================================================

  @Get('product-options/:optionId/values')
  findAllValues(
    @Param('optionId', ParseIntPipe) optionId: number,
  ) {
    return this.productOptionsService.findAllValues(
      optionId,
    );
  }

  @Post('product-options/:optionId/values')
  createValue(
    @Param('optionId', ParseIntPipe) optionId: number,
    @Body()
    createProductOptionValueDto: CreateProductOptionValueDto,
  ) {
    return this.productOptionsService.createValue(
      optionId,
      createProductOptionValueDto,
    );
  }

  @Get('product-option-values/:id')
  findOneValue(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productOptionsService.findOneValue(id);
  }

  @Patch('product-option-values/:id')
  updateValue(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    updateProductOptionValueDto: UpdateProductOptionValueDto,
  ) {
    return this.productOptionsService.updateValue(
      id,
      updateProductOptionValueDto,
    );
  }

  @Delete('product-option-values/:id')
  removeValue(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productOptionsService.removeValue(id);
  }
}