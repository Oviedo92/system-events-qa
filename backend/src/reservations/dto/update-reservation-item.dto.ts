import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateReservationItemDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  seatId?: number;
}