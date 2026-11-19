import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PromoterApplicationsService } from './promoter-applications.service';
import { CreatePromoterApplicationDto } from './dto/create-promoter-application.dto';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    email: string;
    role: 'USER' | 'PROMOTER' | 'MODERATOR' | 'ADMIN';
  };
}

@Controller('promoter-applications')
@UseGuards(JwtAuthGuard)
export class PromoterApplicationsController {
  constructor(
    private readonly promoterApplicationsService: PromoterApplicationsService,
  ) {}

  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePromoterApplicationDto,
  ) {
    return this.promoterApplicationsService.create(
      req.user.userId,
      dto,
    );
  }
}