export class CompanyResponseDto {
  id: string;
  name: string;
  subdomain: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Stats
  userCount?: number;
  activeUsers?: number;
  enabledModules?: string[];
  
  // Admin info
  adminUser?: {
    id: string;
    email: string;
    name: string;
    phone?: string;
    lastLoginAt: Date | null;
  };

  // Only included when creating company with auto-generated password
  generatedPassword?: string;
  passwordNote?: string;
}

export class CompanyListResponseDto {
  companies: CompanyResponseDto[];
  total: number;
  page: number;
  limit: number;
}