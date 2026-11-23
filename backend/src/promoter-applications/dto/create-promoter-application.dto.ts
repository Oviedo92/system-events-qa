import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePromoterApplicationDto {
  @IsOptional()
  @IsEnum(['NATURAL', 'JURIDICAL'])
  personType?: 'NATURAL' | 'JURIDICAL';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2)
  kycStepCompleted?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  businessName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsEnum(['CC', 'CE', 'PASAPORTE', 'NIT'])
  documentType?: 'CC' | 'CE' | 'PASAPORTE' | 'NIT';

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  documentNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  nitVerificationDigit?: string;

  @IsOptional()
  @IsDateString()
  documentIssueDate?: string;

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

  @IsOptional()
  @IsString()
  @MaxLength(80)
  repLegalFirstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  repLegalLastName?: string;

  @IsOptional()
  @IsEnum(['CC', 'CE', 'PASAPORTE', 'NIT'])
  repLegalDocType?: 'CC' | 'CE' | 'PASAPORTE' | 'NIT';

  @IsOptional()
  @IsString()
  @MaxLength(30)
  repLegalDocNumber?: string;

  @IsOptional()
  @IsDateString()
  repLegalDocIssueDate?: string;

  @IsOptional()
  @IsString()
  identityDocPdfUrl?: string;

  @IsOptional()
  @IsString()
  rutPdfUrl?: string;

  @IsOptional()
  @IsString()
  chamberCommercePdfUrl?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  digitalSignatureUrl?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1500)
  description: string;

  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  supportPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  instagramUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  tiktokUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  facebookUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  websiteUrl?: string;
}