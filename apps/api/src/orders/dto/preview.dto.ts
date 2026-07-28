import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CartItemDto {
  @IsString()
  menuItemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class PreviewOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items!: CartItemDto[];

  @IsInt()
  @Min(0)
  @IsOptional()
  cutleryCount?: number = 0;

  @IsInt()
  @Min(0)
  @IsOptional()
  spendFormulas?: number = 0;

  // Баланс формул пользователя (для превью без авторизации).
  // После подключения auth баланс берётся с сервера и это поле игнорируется.
  @IsInt()
  @Min(0)
  @IsOptional()
  formulaBalance?: number = 0;
}
