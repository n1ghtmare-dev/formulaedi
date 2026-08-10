import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

const ORDER_STATUSES = [
  'AWAITING_PAYMENT',
  'PAID',
  'PREPARING',
  'DELIVERING',
  'WAITING_AT_CAFE',
  'COMPLETED',
  'CANCELLED',
] as const;

// ——— Категории ———
export class CreateCategoryDto {
  @IsString() @Length(1, 120) name!: string;
  @IsString() @Length(1, 80) slug!: string;
  @IsOptional() @IsString() iconEmoji?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateCategoryDto {
  @IsOptional() @IsString() @Length(1, 120) name?: string;
  @IsOptional() @IsString() @Length(1, 80) slug?: string;
  @IsOptional() @IsString() iconEmoji?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsInt() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ——— Позиции ———
export class CreateItemDto {
  @IsString() categoryId!: string;
  @IsString() @Length(1, 200) name!: string;
  @IsOptional() @IsString() description?: string;
  @IsInt() @Min(0) priceKopecks!: number;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsBoolean() isHalal?: boolean;
  @IsOptional() @IsBoolean() isAvailable?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdateItemDto {
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() @Length(1, 200) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) priceKopecks?: number;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsBoolean() isHalal?: boolean;
  @IsOptional() @IsBoolean() isAvailable?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

// ——— Заказы ———
export class UpdateOrderStatusDto {
  @IsIn(ORDER_STATUSES) status!: (typeof ORDER_STATUSES)[number];
}

// ——— Пользователи ———
export class BlockUserDto {
  @IsBoolean() isBlocked!: boolean;
}

// ——— Формулы ———
export class AdjustFormulasDto {
  @IsString() userId!: string;
  @IsInt() amount!: number;
  @IsOptional() @IsString() @Length(1, 300) note?: string;
}

// ——— Пароль ———
export class ChangePasswordDto {
  @IsString() @Length(6, 200) currentPassword!: string;
  @IsString() @Length(6, 200) newPassword!: string;
}
