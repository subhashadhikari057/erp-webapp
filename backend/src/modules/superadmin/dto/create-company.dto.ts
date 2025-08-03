import { IsString, IsEmail, IsOptional, Matches, Length } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsString()
  @Length(2, 50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Subdomain must contain only lowercase letters, numbers, and hyphens'
  })
  subdomain: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @Length(2, 100)
  adminName: string;

  @IsString()
  @Length(10, 15)
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be a valid international format'
  })
  adminPhone: string;

  @IsOptional()
  @IsString()
  @Length(8, 100)
  adminPassword?: string; // Optional, will generate random if not provided
}