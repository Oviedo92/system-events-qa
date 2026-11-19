import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ValidateTicketDto } from './dto/validate-ticket.dto';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest {
  user: {
    userId: number;
    email: string;
  };
}

@Controller()
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
  ) { }

  @Get('users/:userId/tickets')
  findAllByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    if (userId !== req.user.userId) {
      throw new ForbiddenException(
        'No puedes consultar las entradas de otro usuario',
      );
    }

    return this.ticketsService.findAllByUser(
      req.user.userId,
    );
  }

  @Get('tickets/:id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.findOneForUser(
      id,
      req.user.userId,
    );
  }

  @Get('orders/:orderId/tickets')
  findAllByOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.findAllByOrderForUser(
      orderId,
      req.user.userId,
    );
  }

  @Post('tickets/validate')
  @HttpCode(HttpStatus.OK)
  validate(
    @Body() dto: ValidateTicketDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ticketsService.validate(
      dto.code,
      req.user.userId,
    );
  }
}