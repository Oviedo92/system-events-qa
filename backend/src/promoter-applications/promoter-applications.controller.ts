import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
  createOrUpdate(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePromoterApplicationDto,
  ) {
    return this.promoterApplicationsService.upsertApplication(req.user.userId, dto);
  }

  @Get('me')
  findMine(@Req() req: AuthenticatedRequest) {
    return this.promoterApplicationsService.findMine(req.user.userId);
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.promoterApplicationsService.findAllForAdmin(req.user.role);
  }

  @Get('my-assignment')
  findMyAssigned(@Req() req: AuthenticatedRequest) {
    return this.promoterApplicationsService.findMyAssigned(req.user.userId);
  }

  @Patch(':id/assign-moderator')
  assignModerator(
    @Param('id', ParseIntPipe) id: number,
    @Body('moderatorId', ParseIntPipe) moderatorId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.promoterApplicationsService.assignModerator(
      id,
      moderatorId,
      req.user.role,
    );
  }

  @Patch(':id/review')
  review(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { decision: 'APPROVE' | 'REJECT'; rejectionReason?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.promoterApplicationsService.review(
      id,
      req.user.userId,
      req.user.role,
      body.decision,
      body.rejectionReason,
    );
  }
}