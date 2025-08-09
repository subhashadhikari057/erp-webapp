// Payload structure stored in JWT tokens
export type JwtPayload = {
    userId: string;
    companyId: string;
    roleIds: string[];       // list of assigned role IDs
    permissions: string[];   // flat permission keys like "employee.view"
    tokenVersion: number;
    isSuperadmin?: boolean;  // true if user has superadmin role
  };
  