import {
  IsString,
  IsNotEmpty,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePromoterApplicationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  businessName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  documentNumber: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone: string;

  @IsString()
  @MinLength(20)
  @MaxLength(1500)
  description: string;
}