import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

// Input validation for login endpoint
export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
