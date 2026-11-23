// dto/create-moderator-application.dto.ts
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateModeratorApplicationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone: string;

  @IsOptional()
  @IsEnum(['CC', 'CE', 'PASAPORTE'])
  documentType?: 'CC' | 'CE' | 'PASAPORTE';

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  documentNumber: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsInt()
  @Min(0)
  yearsExperience: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(20)
  @MaxLength(1500)
  previousEventsSummary: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  identityDocPdfUrl?: string;

  @IsOptional()
  @IsString()
  experienceCertPdfUrl?: string;

  @IsOptional()
  @IsString()
  digitalSignatureUrl?: string;
}