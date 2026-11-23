import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    email: string;
    role: 'USER' | 'PROMOTER' | 'MODERATOR' | 'ADMIN';
  };
}

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Req() req: AuthenticatedRequest,
    @Body() createEventDto: CreateEventDto,
  ) {
    return this.eventsService.create(createEventDto, req.user.userId);
  }

  @Get('my-events')
  @UseGuards(JwtAuthGuard)
  findMyEvents(@Req() req: AuthenticatedRequest) {
    return this.eventsService.findMyEvents(req.user.userId);
  }

  @Get('moderation/pending')
  @UseGuards(JwtAuthGuard)
  findPendingForModeration(@Req() req: AuthenticatedRequest) {
    return this.eventsService.findPendingForModeration(
      req.user.userId,
      req.user.role,
    );
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('city') city?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.eventsService.findAll({
      page: page === undefined ? undefined : Number(page),
      limit: limit === undefined ? undefined : Number(limit),
      search,
      city,
      from,
      to,
    });
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.eventsService.findBySlug(slug);
  }

  @Get(':id/buyers')
  @UseGuards(JwtAuthGuard)
  findBuyers(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.eventsService.findBuyers(id, req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEventDto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, updateEventDto);
  }

  @Patch(':id/submit-review')
  @UseGuards(JwtAuthGuard)
  submitForReview(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.eventsService.submitForReview(id, req.user.userId);
  }

  @Patch(':id/assign-moderator')
  @UseGuards(JwtAuthGuard)
  assignModerator(
    @Param('id', ParseIntPipe) id: number,
    @Body('moderatorId', ParseIntPipe) moderatorId: number,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.eventsService.assignModerator(id, moderatorId, req.user.role);
  }

  @Patch(':id/review')
  @UseGuards(JwtAuthGuard)
  reviewEvent(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { decision: 'APPROVE' | 'REJECT'; rejectionReason?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.eventsService.reviewEvent(
      id,
      req.user.userId,
      req.user.role,
      body.decision,
      body.rejectionReason,
    );
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard)
  publish(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.publish(id);
  }
}