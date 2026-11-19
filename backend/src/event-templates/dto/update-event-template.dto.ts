import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateEventTemplateDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  usesZones?: boolean;

  @IsOptional()
  @IsBoolean()
  usesSeats?: boolean;

  @IsOptional()
  @IsBoolean()
  usesProducts?: boolean;

  @IsOptional()
  @IsBoolean()
  usesPromotions?: boolean;

  @IsOptional()
  @IsBoolean()
  usesQr?: boolean;
}