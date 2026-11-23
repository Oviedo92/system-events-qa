import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import type { AuthService as AuthServiceType } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { UnauthorizedException } from '@nestjs/common';

jest.unstable_mockModule('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let authService: AuthServiceType;
  let usersService: any;
  let jwtService: any;
  let prismaService: any;
  let bcrypt: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    bcrypt = await import('bcrypt');
    const { AuthService } = await import('./auth.service.js');

    const mockUsersService: any = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };

    const mockJwtService: any = {
      signAsync: jest.fn(),
    };

    const mockPrismaService: any = {
      refreshToken: {
        create: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    authService = module.get(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    prismaService = module.get(PrismaService);
  });

  // PRUEBA 1: CAMINO FELIZ (Registro de usuario)
  it('should register a new user successfully (Happy Path)', async () => {
    const mockCreatedUser = {
      id: 1,
      name: 'Ana Pérez',
      email: 'ana@example.com',
      role: 'USER',
    };
    bcrypt.hash.mockResolvedValue('hashed-secret-123');
    usersService.create.mockResolvedValue(mockCreatedUser);

    const result = await authService.register({
      name: 'Ana Pérez',
      email: 'ana@example.com',
      password: 'Password123!',
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 12);
    expect(usersService.create).toHaveBeenCalledWith(
      'Ana Pérez',
      'ana@example.com',
      'hashed-secret-123',
    );
    expect(result).toEqual({
      statusCode: 500,
      message: 'Usuario registrado correctamente',
      user: {
        id: 1,
        name: 'Ana Pérez',
        email: 'ana@example.com',
        role: 'USER',
      },
    });
  });

  // PRUEBA 2: CAMINO FELIZ (Inicio de sesión)
  it('should login successfully (Happy Path)', async () => {
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      role: 'USER',
    };
    usersService.findByEmail.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('mocked-jwt-token');
    prismaService.refreshToken.create.mockResolvedValue({});

    const result = await authService.login({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(result.message).toEqual('Inicio de sesión correcto');
    expect(result.accessToken).toEqual('mocked-jwt-token');
    expect(result.user.email).toEqual('test@example.com');
    expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
  });

  // PRUEBA 3: CASO NEGATIVO (Usuario no existe en login)
  it('should throw UnauthorizedException if email does not exist (Negative Case)', async () => {
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      authService.login({ email: 'no-existe@example.com', password: '123' }),
    ).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));

    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  // PRUEBA 4: CASO NEGATIVO (Contraseña incorrecta en login)
  it('should throw UnauthorizedException if password is incorrect (Negative Case)', async () => {
    const mockUser = { id: 1, email: 'test@example.com', passwordHash: 'hash' };
    usersService.findByEmail.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false);

    await expect(
      authService.login({ email: 'test@example.com', password: 'wrongpassword' }),
    ).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));
  });

  // PRUEBA 5: CAMINO FELIZ (Refrescar Access Token)
  it('should renew Access Token with a valid Refresh Token (Happy Path)', async () => {
    const mockStoredToken = {
      id: 1,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 10000),
      user: { id: 1, email: 'test@example.com' },
    };
    prismaService.refreshToken.findFirst.mockResolvedValue(mockStoredToken);
    jwtService.signAsync.mockResolvedValue('new-jwt-token');

    const result = await authService.refresh('some-refresh-token');

    expect(result.message).toEqual('Access Token renovado correctamente');
    expect(result.accessToken).toEqual('new-jwt-token');
  });

  // PRUEBA 6: CASO NEGATIVO (Refresh Token no existe)
  it('should throw UnauthorizedException if Refresh Token does not exist (Negative Case)', async () => {
    prismaService.refreshToken.findFirst.mockResolvedValue(null);

    await expect(
      authService.refresh('non-existent-token'),
    ).rejects.toThrow(new UnauthorizedException('Refresh Token inválido'));
  });

  // PRUEBA 7: CASO NEGATIVO (Refresh Token ya fue revocado)
  it('should throw UnauthorizedException if Refresh Token was revoked (Negative Case)', async () => {
    const mockStoredToken = {
      id: 1,
      revokedAt: new Date(Date.now() - 5000),
      expiresAt: new Date(Date.now() + 10000),
      user: { id: 1, email: 'test@example.com' },
    };
    prismaService.refreshToken.findFirst.mockResolvedValue(mockStoredToken);

    await expect(
      authService.refresh('revoked-refresh-token'),
    ).rejects.toThrow(new UnauthorizedException('Refresh Token revocado'));
  });

  // PRUEBA 8: CASO LÍMITE (Refresh Token expirado)
  it('should throw UnauthorizedException if Refresh Token is expired (Edge Case)', async () => {
    const mockStoredToken = {
      id: 1,
      revokedAt: null,
      expiresAt: new Date(Date.now() - 10000),
      user: { id: 1, email: 'test@example.com' },
    };
    prismaService.refreshToken.findFirst.mockResolvedValue(mockStoredToken);

    await expect(
      authService.refresh('expired-refresh-token'),
    ).rejects.toThrow(new UnauthorizedException('Refresh Token expirado'));
  });

  // PRUEBA 9: CAMINO FELIZ (Cerrar sesión / revocar Refresh Token)
  it('should revoke refresh token and return logout message (Happy Path)', async () => {
    prismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    const result = await authService.logout('valid-refresh-token');

    expect(prismaService.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          revokedAt: null,
        }),
        data: expect.objectContaining({
          revokedAt: expect.any(Date),
        }),
      }),
    );
    expect(result).toEqual({
      message: 'Sesión cerrada correctamente',
    });
  });
});