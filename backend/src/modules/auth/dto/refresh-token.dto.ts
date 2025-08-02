import { IsNotEmpty } from 'class-validator';

// Input DTO for token refresh
export class RefreshTokenDto {
  @IsNotEmpty()
  refreshToken: string;
}