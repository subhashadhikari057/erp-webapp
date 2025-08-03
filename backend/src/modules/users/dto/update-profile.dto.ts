import { IsOptional, IsString, IsEmail, Matches } from 'class-validator';

/**
 * DTO for updating the current user's profile.
 * All fields are optional; only provided fields will be updated.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;   // User's full name

  @IsOptional()
  @IsEmail()
  email?: string;  // User's email address

  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'Phone must be exactly 10 digits.' })
  phone?: string;  // User's phone number

  // You can add more optional fields here (e.g., address, position)
}
