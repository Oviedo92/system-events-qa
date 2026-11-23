import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePromoterApplicationDto } from './dto/create-promoter-application.dto';

@Injectable()
export class PromoterApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  private validateAgeIfNatural(dto: CreatePromoterApplicationDto) {
    if ((dto.personType ?? 'NATURAL') === 'NATURAL' && dto.birthDate) {
      const birth = new Date(dto.birthDate);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      if (age < 18) {
        throw new BadRequestException(
          'El titular debe ser mayor de 18 años para registrarse como promotor.',
        );
      }
    }
  }

  async upsertApplication(userId: number, dto: CreatePromoterApplicationDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');

    if (user.role !== 'USER' && user.role !== 'PROMOTER') {
      throw new ForbiddenException(
        'Solo compradores o promotores pueden gestionar su expediente KYC.',
      );
    }

    this.validateAgeIfNatural(dto);

    const payload = {
      personType: dto.personType ?? 'NATURAL',
      kycStepCompleted: dto.kycStepCompleted ?? 2,
      businessName: dto.businessName,
      phone: dto.phone,
      firstName: dto.firstName,
      lastName: dto.lastName,
      documentType: dto.documentType ?? 'CC',
      documentNumber: dto.documentNumber,
      nitVerificationDigit: dto.nitVerificationDigit,
      documentIssueDate: dto.documentIssueDate ? new Date(dto.documentIssueDate) : null,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
      department: dto.department,
      city: dto.city,
      address: dto.address,
      repLegalFirstName: dto.repLegalFirstName,
      repLegalLastName: dto.repLegalLastName,
      repLegalDocType: dto.repLegalDocType,
      repLegalDocNumber: dto.repLegalDocNumber,
      repLegalDocIssueDate: dto.repLegalDocIssueDate
        ? new Date(dto.repLegalDocIssueDate)
        : null,
      identityDocPdfUrl: dto.identityDocPdfUrl,
      rutPdfUrl: dto.rutPdfUrl,
      chamberCommercePdfUrl: dto.chamberCommercePdfUrl,
      logoUrl: dto.logoUrl,
      digitalSignatureUrl: dto.digitalSignatureUrl,
      description: dto.description,
      supportEmail: dto.supportEmail,
      supportPhone: dto.supportPhone,
      instagramUrl: dto.instagramUrl,
      tiktokUrl: dto.tiktokUrl,
      facebookUrl: dto.facebookUrl,
      websiteUrl: dto.websiteUrl,
    };

    const existing = await this.prisma.promoterApplication.findUnique({
      where: { userId },
    });

    if (existing) {
      if (existing.status === 'APPROVED' && user.role === 'PROMOTER') {
        throw new ConflictException('Tu expediente KYC ya está aprobado y verificado.');
      }
      return this.prisma.promoterApplication.update({
        where: { userId },
        data: {
          ...payload,
          status: 'PENDING',
          rejectionReason: null,
          reviewedAt: null,
        },
      });
    }

    return this.prisma.promoterApplication.create({
      data: {
        ...payload,
        userId,
      },
    });
  }

  async findMine(userId: number) {
    return this.prisma.promoterApplication.findUnique({
      where: { userId },
    });
  }

  async findAllForAdmin(role: string) {
    if (role !== 'ADMIN') {
      throw new ForbiddenException('Solo el administrador puede listar las solicitudes.');
    }

    return this.prisma.promoterApplication.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, isVerified: true, verificationBadge: true },
        },
        moderator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMyAssigned(moderatorId: number) {
    return this.prisma.promoterApplication.findFirst({
      where: { moderatorId, status: 'PENDING' },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async assignModerator(applicationId: number, moderatorId: number, actorRole: string) {
    if (actorRole !== 'ADMIN') {
      throw new ForbiddenException('Solo el administrador puede delegar solicitudes.');
    }

    const moderator = await this.prisma.user.findUnique({
      where: { id: moderatorId },
      include: { assignedApplication: true, assignedEvent: true },
    });

    if (!moderator || moderator.role !== 'MODERATOR') {
      throw new BadRequestException('El usuario seleccionado no es un moderador válido.');
    }

    if (moderator.assignedApplication || moderator.assignedEvent) {
      throw new BadRequestException(
        'Este moderador ya tiene una tarea asignada (cardinalidad estricta 1:1).',
      );
    }

    return this.prisma.promoterApplication.update({
      where: { id: applicationId },
      data: { moderatorId },
      include: { moderator: { select: { id: true, name: true, email: true } } },
    });
  }

  async review(
    applicationId: number,
    actorId: number,
    actorRole: string,
    decision: 'APPROVE' | 'REJECT',
    rejectionReason?: string,
  ) {
    const app = await this.prisma.promoterApplication.findUnique({
      where: { id: applicationId },
    });
    if (!app) throw new NotFoundException('Solicitud no encontrada.');

    if (actorRole === 'MODERATOR' && app.moderatorId !== actorId) {
      throw new ForbiddenException('Esta solicitud no está asignada a tu cola 1:1.');
    }

    if (decision === 'REJECT' && !rejectionReason?.trim()) {
      throw new BadRequestException('Debes indicar el motivo del rechazo.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.promoterApplication.update({
        where: { id: applicationId },
        data: {
          status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          rejectionReason: decision === 'REJECT' ? rejectionReason?.trim() : null,
          reviewedAt: new Date(),
          moderatorId: null, // Libera al moderador 1:1
        },
      });

      if (decision === 'APPROVE') {
        await tx.user.update({
          where: { id: app.userId },
          data: {
            role: 'PROMOTER',
            isVerified: true,
            verifiedAt: new Date(),
            verificationBadge: 'VERIFIED_PROMOTER',
            brandName: app.businessName,
            avatarUrl: app.logoUrl,
            bio: app.description.slice(0, 300),
            supportEmail: app.supportEmail,
            supportPhone: app.supportPhone ?? app.phone,
            instagramUrl: app.instagramUrl,
            tiktokUrl: app.tiktokUrl,
            facebookUrl: app.facebookUrl,
            websiteUrl: app.websiteUrl,
          },
        });
      }

      return updated;
    });
  }
}