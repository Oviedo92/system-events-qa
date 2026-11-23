import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'kyc');

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

@Controller('uploads')
export class UploadsController {
  @Post('kyc-file')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureUploadDir();
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unique}${extname(file.originalname).toLowerCase()}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // Máx 5 MB
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'application/pdf',
          'image/png',
          'image/jpeg',
          'image/webp',
        ];
        if (!allowed.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Archivo inválido. Solo se permite PDF (máx 5MB) o imagen PNG/JPG/WEBP.',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  uploadKycFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Debes adjuntar un archivo.');
    }

    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    return {
      url: `${baseUrl}/uploads/kyc/${file.filename}`,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  @Post('signature')
  saveDigitalSignature(@Body('dataUrl') dataUrl: string) {
    if (!dataUrl || !dataUrl.startsWith('data:image/png;base64,')) {
      throw new BadRequestException('La firma digital debe enviarse en formato PNG válido.');
    }

    ensureUploadDir();
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const fileName = `sig-${Date.now()}-${Math.round(Math.random() * 1e9)}.png`;
    fs.writeFileSync(join(UPLOAD_DIR, fileName), Buffer.from(base64Data, 'base64'));

    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    return {
      url: `${baseUrl}/uploads/kyc/${fileName}`,
    };
  }
}