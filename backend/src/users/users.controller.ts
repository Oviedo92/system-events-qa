import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  findAll() {
    return this.usersService.findAll();
  }

  @Get('moderators/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getModeratorsAvailability() {
    return this.usersService.getModeratorsAvailability();
  }
}