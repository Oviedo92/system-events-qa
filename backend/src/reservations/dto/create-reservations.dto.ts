import {
  IsInt,
  Min,
} from 'class-validator';

export class CreateReservationDto {
  @IsInt()
  @Min(1)
  eventId: number;

  @IsInt()
  @Min(1)
  cartId: number;
}