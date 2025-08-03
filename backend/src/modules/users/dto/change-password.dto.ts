import { IsString, MinLength } from 'class-validator';

/**
 * DTO for changing user's own password.
 */
export class ChangePasswordDto {
  @IsString()
  @MinLength(6, { message: 'Current password is required and must be at least 6 characters.' })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters.' })
  newPassword: string;
}
