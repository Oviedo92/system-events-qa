import {
  IsInt,
  Min,
} from 'class-validator';

export class CreateCartDto {
  @IsInt()
  @Min(1)
  eventId: number;
}