import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Некорректная почта' })
  email!: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  fullName?: string;
}

export class AdminLoginDto {
  @IsEmail({}, { message: 'Некорректная почта' })
  email!: string;

  @IsString()
  @Length(6, 200, { message: 'Пароль не короче 6 символов' })
  password!: string;
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
