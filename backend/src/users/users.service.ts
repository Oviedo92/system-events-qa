import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  async create(name: string, email: string, passwordHash: string) {
    return this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
  }

  async getModeratorsAvailability() {
    const moderators = await this.prisma.user.findMany({
      where: { role: 'MODERATOR' },
      select: {
        id: true,
        name: true,
        email: true,
        assignedApplication: {
          select: { id: true, status: true },
        },
        assignedEvent: {
          select: { id: true, status: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    return moderators.map((mod) => {
      const hasActiveApp =
        mod.assignedApplication !== null &&
        mod.assignedApplication.status === 'PENDING';
      const hasActiveEvent =
        mod.assignedEvent !== null &&
        mod.assignedEvent.status === 'PENDING_REVIEW';

      return {
        id: mod.id,
        name: mod.name,
        email: mod.email,
        isBusy: hasActiveApp || hasActiveEvent,
        currentAssignmentType: hasActiveApp
          ? 'PROMOTER_APPLICATION'
          : hasActiveEvent
            ? 'EVENT'
            : null,
      };
    });
  }
}