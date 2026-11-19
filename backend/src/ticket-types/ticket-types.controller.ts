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

import { TicketTypesService } from './ticket-types.service';
import { CreateTicketTypeDto } from './dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from './dto/update-ticket-type.dto';

@Controller()
export class TicketTypesController {
  constructor(
    private readonly ticketTypesService: TicketTypesService,
  ) {}

  @Get('events/:eventId/ticket-types')
  findAllByEvent(
    @Param('eventId', ParseIntPipe) eventId: number,
  ) {
    return this.ticketTypesService.findAllByEvent(eventId);
  }

  @Post('events/:eventId/ticket-types')
  create(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() createTicketTypeDto: CreateTicketTypeDto,
  ) {
    return this.ticketTypesService.create(
      eventId,
      createTicketTypeDto,
    );
  }

  @Get('ticket-types/:id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ticketTypesService.findOne(id);
  }

  @Patch('ticket-types/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTicketTypeDto: UpdateTicketTypeDto,
  ) {
    return this.ticketTypesService.update(
      id,
      updateTicketTypeDto,
    );
  }

  @Delete('ticket-types/:id')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ticketTypesService.remove(id);
  }
}