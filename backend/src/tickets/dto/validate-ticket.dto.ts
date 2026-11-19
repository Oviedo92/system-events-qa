
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class ValidateTicketDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, {
    message: 'El código no puede contener únicamente espacios',
  })
  @MaxLength(100)
  code: string;
}
