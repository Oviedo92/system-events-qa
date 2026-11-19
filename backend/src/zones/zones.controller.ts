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

import { ZonesService } from './zones.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';

@Controller()
export class ZonesController {
  constructor(
    private readonly zonesService: ZonesService,
  ) {}

  @Get('events/:eventId/zones')
  findAllByEvent(
    @Param('eventId', ParseIntPipe) eventId: number,
  ) {
    return this.zonesService.findAllByEvent(eventId);
  }

  @Post('events/:eventId/zones')
  create(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() createZoneDto: CreateZoneDto,
  ) {
    return this.zonesService.create(
      eventId,
      createZoneDto,
    );
  }

  @Patch('zones/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateZoneDto: UpdateZoneDto,
  ) {
    return this.zonesService.update(
      id,
      updateZoneDto,
    );
  }

  @Delete('zones/:id')
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.zonesService.remove(id);
  }
}