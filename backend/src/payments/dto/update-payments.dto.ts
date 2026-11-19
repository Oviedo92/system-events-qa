import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdatePaymentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsIn(['REJECTED'])
  status?: string;
}
