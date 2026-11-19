import {
    IsArray,
    IsBoolean,
    IsDateString,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class CreatePromotionDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    code?: string;

    @IsString()
    @IsNotEmpty()
    @IsIn(['PERCENTAGE', 'FIXED'])
    type: string;

    @IsNumber()
    @Min(0)
    value: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    minSubtotal?: number;

    @IsOptional()
    @IsDateString()
    startsAt?: string;

    @IsOptional()
    @IsDateString()
    endsAt?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    maxUses?: number;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsBoolean()
    appliesToAll?: boolean;

    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    @Min(1, { each: true })
    ticketTypeIds?: number[];

    @IsOptional()
    @IsArray()
    @IsInt({ each: true })
    @Min(1, { each: true })
    productIds?: number[];
}