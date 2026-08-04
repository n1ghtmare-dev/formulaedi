import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Building, DeliveryType } from '@formulaedi/shared';

export class CreateOrderItemDto {
  @IsString()
  menuItemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsInt()
  @Min(0)
  @IsOptional()
  cutleryCount?: number = 0;

  @IsInt()
  @Min(0)
  @IsOptional()
  spendFormulas?: number = 0;

  @IsEnum(DeliveryType)
  deliveryType!: DeliveryType;

  @IsOptional()
  @IsEnum(Building)
  building?: Building;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  room?: string;

  @IsString()
  @Matches(/^(\+7|8|7)\d{10}$/, { message: 'Некорректный номер телефона' })
  contactPhone!: string;
}
