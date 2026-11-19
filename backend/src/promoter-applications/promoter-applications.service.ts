import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePromoterApplicationDto } from './dto/create-promoter-application.dto';

@Injectable()
export class PromoterApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreatePromoterApplicationDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    if (user.role !== 'USER') {
      throw new ConflictException(
        'Solo las cuentas de usuario pueden solicitar acceso a promotor.',
      );
    }

    const existing = await this.prisma.promoterApplication.findUnique({
      where: { userId },
    });

    if (existing && existing.status !== 'REJECTED') {
      throw new ConflictException(
        'Ya tienes una solicitud pendiente o aprobada.',
      );
    }

    if (existing) {
      return this.prisma.promoterApplication.update({
        where: { userId },
        data: {
          ...dto,
          status: 'PENDING',
          reviewedAt: null,
        },
      });
    }

    return this.prisma.promoterApplication.create({
      data: {
        ...dto,
        userId,
      },
    });
  }
}