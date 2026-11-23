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
import { ModeratorApplicationsService } from './moderator-applications.service';
import { CreateModeratorApplicationDto } from './dto/create-moderator-application.dto';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    email: string;
    role: 'USER' | 'PROMOTER' | 'MODERATOR' | 'ADMIN';
  };
}

@Controller('moderator-applications')
export class ModeratorApplicationsController {
  constructor(
    private readonly moderatorApplicationsService: ModeratorApplicationsService,
  ) {}

  @Post()
  create(@Body() dto: CreateModeratorApplicationDto) {
    return this.moderatorApplicationsService.create(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Req() req: AuthenticatedRequest) {
    return this.moderatorApplicationsService.findAll(req.user.role);
  }

  @Patch(':id/review')
  @UseGuards(JwtAuthGuard)
  review(
    @Param('id', ParseIntPipe) id: number,
    @Body('decision') decision: 'APPROVE' | 'REJECT',
    @Req() req: AuthenticatedRequest,
  ) {
    return this.moderatorApplicationsService.review(
      id,
      req.user.userId,
      req.user.role,
      decision,
    );
  }
}