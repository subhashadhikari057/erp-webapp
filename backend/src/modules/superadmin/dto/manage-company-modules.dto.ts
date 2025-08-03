import { IsBoolean, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class ModuleSettingsDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class ManageCompanyModulesDto {
  @IsOptional()
  @Type(() => ModuleSettingsDto)
  HRM?: ModuleSettingsDto;

  @IsOptional()
  @Type(() => ModuleSettingsDto)
  ATTENDANCE?: ModuleSettingsDto;

  @IsOptional()
  @Type(() => ModuleSettingsDto)
  PAYROLL?: ModuleSettingsDto;

  @IsOptional()
  @Type(() => ModuleSettingsDto)
  REPORTS?: ModuleSettingsDto;
}