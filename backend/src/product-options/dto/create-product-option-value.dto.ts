import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProductOptionValueDto {
  @IsString()
  @IsNotEmpty()
  value: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}