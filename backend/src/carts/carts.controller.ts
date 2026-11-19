
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { CartsService } from './carts.service';
import { CreateCartDto } from './dto/create-carts.dto';
import { UpdateCartDto } from './dto/update-carts.dto';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    email: string;
  };
}

@Controller()
@UseGuards(JwtAuthGuard)
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get('users/:userId/cart')
  findAllByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertOwner(userId, req.user.userId);
    return this.cartsService.findAllByUser(req.user.userId);
  }

  @Post('users/:userId/cart')
  create(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: CreateCartDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertOwner(userId, req.user.userId);
    return this.cartsService.create(req.user.userId, dto);
  }

  @Get('carts/:id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.cartsService.findOneForUser(id, req.user.userId);
  }

  @Patch('carts/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCartDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.cartsService.updateForUser(id, req.user.userId, dto);
  }

  @Delete('carts/:id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.cartsService.removeForUser(id, req.user.userId);
  }

  @Post('carts/:cartId/items')
  addItem(
    @Param('cartId', ParseIntPipe) cartId: number,
    @Body() dto: CreateCartItemDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.cartsService.addItemForUser(cartId, req.user.userId, dto);
  }

  @Patch('cart-items/:id')
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCartItemDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.cartsService.updateItemForUser(id, req.user.userId, dto);
  }

  @Delete('cart-items/:id')
  removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.cartsService.removeItemForUser(id, req.user.userId);
  }

  private assertOwner(routeUserId: number, authenticatedUserId: number) {
    if (routeUserId !== authenticatedUserId) {
      // No se permite operar sobre la cuenta de otro usuario.
      const { ForbiddenException } = require('@nestjs/common');
      throw new ForbiddenException('No puedes acceder al carrito de otro usuario');
    }
  }
}
