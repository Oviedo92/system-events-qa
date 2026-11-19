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

import { SeatsService } from './seats.service';
import { CreateSeatDto } from './dto/create-seat.dto';
import { UpdateSeatDto } from './dto/update-seat.dto';

@Controller()
export class SeatsController {
  constructor(
    private readonly seatsService: SeatsService,
  ) {}

  @Get('events/:eventId/seats')
  findAllByEvent(
    @Param('eventId', ParseIntPipe) eventId: number,
  ) {
    return this.seatsService.findAllByEvent(eventId);
  }

  @Post('events/:eventId/seats')
  create(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() createSeatDto: CreateSeatDto,
  ) {
    return this.seatsService.create(
      eventId,
      createSeatDto,
    );
  }

  @Patch('seats/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSeatDto: UpdateSeatDto,
  ) {
    return this.seatsService.update(
      id,
      updateSeatDto,
    );
  }

  @Delete('seats/:id')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.seatsService.remove(id);
  }
}