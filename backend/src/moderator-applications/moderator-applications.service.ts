// moderator-applications.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { CreateModeratorApplicationDto } from './dto/create-moderator-application.dto';

@Injectable()
export class ModeratorApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateModeratorApplicationDto) {
    const existingApp = await this.prisma.moderatorApplication.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        status: { in: ['PENDING', 'APPROVED'] },
      },
    });

    if (existingApp) {
      throw new ConflictException('Ya existe una postulación activa con este correo.');
    }

    return this.prisma.moderatorApplication.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email.toLowerCase(),
        phone: dto.phone,
        documentType: dto.documentType ?? 'CC',
        documentNumber: dto.documentNumber,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        department: dto.department,
        city: dto.city,
        address: dto.address,
        yearsExperience: dto.yearsExperience,
        previousEventsSummary: dto.previousEventsSummary,
        photoUrl: dto.photoUrl,
        identityDocPdfUrl: dto.identityDocPdfUrl,
        experienceCertPdfUrl: dto.experienceCertPdfUrl,
        digitalSignatureUrl: dto.digitalSignatureUrl,
      },
    });
  }

  async findAll(actorRole: string) {
    if (actorRole !== 'ADMIN') {
      throw new ForbiddenException('Solo el administrador puede revisar postulaciones de moderador.');
    }

    return this.prisma.moderatorApplication.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async review(
    id: number,
    actorId: number,
    actorRole: string,
    decision: 'APPROVE' | 'REJECT',
    rejectionReason?: string,
  ) {
    if (actorRole !== 'ADMIN') {
      throw new ForbiddenException('Solo el administrador puede aprobar o rechazar moderadores.');
    }

    const app = await this.prisma.moderatorApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('Postulación no encontrada.');
    if (app.status !== 'PENDING') {
      throw new BadRequestException('Esta postulación ya fue resuelta.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedApp = await tx.moderatorApplication.update({
        where: { id },
        data: {
          status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          rejectionReason: decision === 'REJECT' ? rejectionReason?.trim() : null,
          reviewedAt: new Date(),
          reviewedById: actorId,
        },
      });

      if (decision === 'APPROVE') {
        const fullName = `${app.firstName} ${app.lastName}`.trim();
        const existingUser = await tx.user.findUnique({ where: { email: app.email } });
        const verifiedData = {
          role: 'MODERATOR' as const,
          isVerified: true,
          verifiedAt: new Date(),
          verificationBadge: 'VERIFIED_MODERATOR',
          phone: app.phone,
          documentType: app.documentType,
          documentNumber: app.documentNumber,
          city: app.city,
          avatarUrl: app.photoUrl,
        };

        if (existingUser) {
          await tx.user.update({
            where: { id: existingUser.id },
            data: verifiedData,
          });
        } else {
          const passwordHash = await bcrypt.hash('Moderator2026*', 10);
          await tx.user.create({
            data: {
              name: fullName,
              email: app.email,
              passwordHash,
              ...verifiedData,
            },
          });
        }
      }

      return updatedApp;
    });
  }
}