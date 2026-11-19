import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateSeatDto {
  @IsString()
  @IsNotEmpty()
  row: string;

  @IsInt()
  @Min(1)
  number: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  zoneId?: number;
}