import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservations.dto';
import { CreateReservationItemDto } from './dto/create-reservation-item.dto';
import { UpdateReservationItemDto } from './dto/update-reservation-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest {
  user: {
    userId: number;
    email: string;
  };
}

@Controller()
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(
    private readonly reservationsService: ReservationsService,
  ) { }

  @Get('users/:userId/reservations')
  findAllByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertUser(userId, req.user.userId);

    return this.reservationsService.findAllByUser(
      req.user.userId,
    );
  }

  @Get('reservations/:id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reservationsService.findOneForUser(
      id,
      req.user.userId,
    );
  }

  @Post('users/:userId/reservations')
  create(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: CreateReservationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertUser(userId, req.user.userId);

    return this.reservationsService.create(
      req.user.userId,
      dto,
    );
  }

  @Post('reservations/:id/cancel')
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reservationsService.cancelForUser(
      id,
      req.user.userId,
    );
  }

  @Get('reservations/:reservationId/items')
  findAllItems(
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reservationsService.findAllItemsForUser(
      reservationId,
      req.user.userId,
    );
  }

  @Post('reservations/:reservationId/items')
  createItem(
    @Param('reservationId', ParseIntPipe) reservationId: number,
    @Body() dto: CreateReservationItemDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reservationsService.createItemForUser(
      reservationId,
      req.user.userId,
      dto,
    );
  }

  @Patch('reservation-items/:id')
  updateItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReservationItemDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reservationsService.updateItemForUser(
      id,
      req.user.userId,
      dto,
    );
  }

  @Delete('reservation-items/:id')
  removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.reservationsService.removeItemForUser(
      id,
      req.user.userId,
    );
  }

  private assertUser(
    requestedUserId: number,
    authenticatedUserId: number,
  ) {
    if (requestedUserId !== authenticatedUserId) {
      throw new ForbiddenException(
        'No puedes acceder a las reservas de otro usuario',
      );
    }
  }
}