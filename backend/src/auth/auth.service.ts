import {
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { createHash, randomBytes } from 'crypto';

import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../users/users.service';

import { PrismaService } from '../prisma/prisma.service';

import { ConflictException  } from '@nestjs/common';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService,
    ) { }

    async register(body: {
    name: string;
    email: string;
    password: string;
  }) {
    const normalizedEmail = body.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(body.password, 12);

    try {
      const user = await this.usersService.create(
        body.name.trim(),
        normalizedEmail,
        passwordHash,
      );

      return {
        statusCode: 201,
        message: 'Usuario registrado correctamente',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
      ) {
        throw new ConflictException(
          'Este correo electrónico ya está registrado. Inicia sesión o utiliza otro correo.',
        );
      }
      throw error;
    }
  }

    async login(body: {
        email: string;
        password: string;
    }) {
        const user = await this.usersService.findByEmail(body.email);

        if (!user) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        const passwordValid = await bcrypt.compare(
            body.password,
            user.passwordHash,
        );

        if (!passwordValid) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        // Access Token: 15 minutos
        const accessToken = await this.jwtService.signAsync({
            sub: user.id,
            email: user.email,
        });

        // Refresh Token aleatorio
        const refreshToken = randomBytes(64).toString('hex');

        // Guardamos solamente el hash del Refresh Token
        const tokenHash = createHash('sha256')
            .update(refreshToken)
            .digest('hex');

        // Refresh Token: 7 días
        const expiresAt = new Date();

        expiresAt.setDate(expiresAt.getDate() + 7);

        await this.prisma.refreshToken.create({
            data: {
                tokenHash,
                expiresAt,
                userId: user.id,
            },
        });

        return {
            message: 'Inicio de sesión correcto',

            accessToken,

            expiresIn: 900,

            refreshToken,

            refreshExpiresIn: 604800,

            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        };
    }

    async refresh(refreshToken: string) {
        // Convertimos el Refresh Token recibido a su hash
        const tokenHash = createHash('sha256')
            .update(refreshToken)
            .digest('hex');

        // Buscamos el Refresh Token en la BD
        const storedToken = await this.prisma.refreshToken.findFirst({
            where: {
                tokenHash,
            },
            include: {
                user: true,
            },
        });

        // No existe
        if (!storedToken) {
            throw new UnauthorizedException('Refresh Token inválido');
        }

        // Fue revocado
        if (storedToken.revokedAt) {
            throw new UnauthorizedException('Refresh Token revocado');
        }

        // Ya expiró
        if (storedToken.expiresAt <= new Date()) {
            throw new UnauthorizedException('Refresh Token expirado');
        }

        // Generamos un nuevo Access Token
        const accessToken = await this.jwtService.signAsync({
            sub: storedToken.user.id,
            email: storedToken.user.email,
        });

        return {
            message: 'Access Token renovado correctamente',
            accessToken,
            expiresIn: 900,
        };
    }

    async logout(refreshToken: string) {
        const tokenHash = createHash('sha256')
            .update(refreshToken)
            .digest('hex');

        await this.prisma.refreshToken.updateMany({
            where: {
                tokenHash,
                revokedAt: null,
            },
            data: {
                revokedAt: new Date(),
            },
        });

        return {
            message: 'Sesión cerrada correctamente',
        };
    }
}