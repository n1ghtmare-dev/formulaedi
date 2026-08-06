import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class RequestCodeDto {
  // +7XXXXXXXXXX или 8XXXXXXXXXX — нормализуем в сервисе
  @IsString()
  @Matches(/^(\+7|8|7)\d{10}$/, { message: 'Некорректный номер телефона' })
  phone!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class UpdateProfileDto {
  @IsString()
  @Length(2, 120)
  fullName!: string;
}

export class VerifyCodeDto {
  @IsString()
  @Matches(/^(\+7|8|7)\d{10}$/, { message: 'Некорректный номер телефона' })
  phone!: string;

  @IsString()
  @Length(4, 6)
  code!: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  fullName?: string;
}
