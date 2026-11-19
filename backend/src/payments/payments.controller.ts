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

import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payments.dto';
import { UpdatePaymentDto } from './dto/update-payments.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedRequest {
  user: {
    userId: number;
    email: string;
  };
}

@Controller()
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get('users/:userId/payments')
  findAllByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    if (userId !== req.user.userId) {
      throw new ForbiddenException(
        'No puedes consultar los pagos de otro usuario',
      );
    }

    return this.paymentsService.findAllByUser(
      req.user.userId,
    );
  }

  @Get('payments/:id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.findOneForUser(
      id,
      req.user.userId,
    );
  }

  @Post('payments')
  create(
    @Body() dto: CreatePaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.create(
      req.user.userId,
      dto,
    );
  }

  @Patch('payments/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.update(
      id,
      req.user.userId,
      dto,
    );
  }

  @Delete('payments/:id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.paymentsService.remove(
      id,
      req.user.userId,
    );
  }

  @Post('payments/:id/simulate-approval')
  simulateApproval(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        'La aprobación simulada no está disponible en producción',
      );
    }

    return this.paymentsService.simulateApproval(
      id,
      req.user.userId,
    );
  }
}