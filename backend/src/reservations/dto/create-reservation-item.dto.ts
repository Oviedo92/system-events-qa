import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateReservationItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  ticketTypeId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  productVariantId?: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  seatId?: number;
}