import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotions.dto';
import { UpdatePromotionDto } from './dto/update-promotions.dto';

@Controller()
export class PromotionsController {
  constructor(
    private readonly promotionsService: PromotionsService,
  ) {}

  @Get('events/:eventId/promotions')
  findAllByEvent(@Param('eventId') eventId: string) {
    return this.promotionsService.findAllByEvent(
      Number(eventId),
    );
  }

  @Post('events/:eventId/promotions')
  create(
    @Param('eventId') eventId: string,
    @Body() createPromotionDto: CreatePromotionDto,
  ) {
    return this.promotionsService.create(
      Number(eventId),
      createPromotionDto,
    );
  }

  @Get('promotions/:id')
  findOne(@Param('id') id: string) {
    return this.promotionsService.findOne(
      Number(id),
    );
  }

  @Patch('promotions/:id')
  update(
    @Param('id') id: string,
    @Body() updatePromotionDto: UpdatePromotionDto,
  ) {
    return this.promotionsService.update(
      Number(id),
      updatePromotionDto,
    );
  }

  @Delete('promotions/:id')
  remove(@Param('id') id: string) {
    return this.promotionsService.remove(
      Number(id),
    );
  }
}