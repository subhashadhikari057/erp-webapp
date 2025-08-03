import { IsString, IsBoolean, IsOptional, Length } from 'class-validator';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}