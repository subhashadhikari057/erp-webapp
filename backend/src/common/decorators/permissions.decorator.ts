import { SetMetadata } from '@nestjs/common';

// New, more descriptive decorator for permissions
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) => 
  SetMetadata(PERMISSIONS_KEY, permissions);

// Alias for better readability
export const HasPermission = (...permissions: string[]) => 
  SetMetadata(PERMISSIONS_KEY, permissions);