import {
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

export class UpdateCartDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  promotionId?: number;
}