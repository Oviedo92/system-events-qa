import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateEventTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsBoolean()
  usesZones: boolean;

  @IsBoolean()
  usesSeats: boolean;

  @IsBoolean()
  usesProducts: boolean;

  @IsBoolean()
  usesPromotions: boolean;

  @IsBoolean()
  usesQr: boolean;
}