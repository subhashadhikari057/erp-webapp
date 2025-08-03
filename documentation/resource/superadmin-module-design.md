# 🌟 Superadmin Module Design & Implementation Plan

## 📁 Module Structure
```
src/modules/
├── auth/                    ← Existing
├── users/                   ← Existing  
└── superadmin/              ← NEW
    ├── superadmin.module.ts
    ├── superadmin.controller.ts
    ├── superadmin.service.ts
    ├── dto/
    │   ├── create-company.dto.ts
    │   ├── update-company.dto.ts
    │   └── company-response.dto.ts
    └── guards/
        └── superadmin.guard.ts
```

## 🔐 Security Strategy

### 1. Tenant Context Resolution (Triple Security)
```typescript
// Priority order for tenant identification:
1. JWT Payload: user.companyId (most secure)
2. Subdomain: abc.myerp.com → extract "abc" 
3. Header: X-Company-Id (fallback)
```

### 2. Access Control Levels
```
🌟 SUPERADMIN
├── No companyId in JWT (or special superadmin companyId)
├── Can access /superadmin/* routes
├── Bypasses all tenant restrictions
└── Full system access

🏢 COMPANY ADMIN  
├── Has companyId in JWT
├── Can access /admin/* routes for their company
├── Tenant-scoped access only
└── Cannot access other companies

👤 REGULAR USER
├── Has companyId + role permissions in JWT
├── Can access routes based on permissions
├── Tenant-scoped + permission-scoped
└── Self-service only
```

## 🎯 Module Access System

### How Users Get Module Access:
```
1. Company is created with default modules disabled
2. Superadmin enables modules for company
3. Company admin can toggle enabled modules on/off
4. Users access features based on:
   - Company module enabled: CompanyModule.enabled = true
   - User has permissions: User role permissions
   - Feature guard: @ModuleRequired('PAYROLL')
```

### Example Flow:
```
1. Superadmin creates "ABC Corp"
   ├── Default: All modules disabled
   
2. Superadmin enables modules for ABC Corp:
   ├── HRM: enabled
   ├── PAYROLL: enabled  
   ├── ATTENDANCE: disabled
   
3. ABC Corp admin creates roles:
   ├── "HR Manager": payroll:read, payroll:process
   ├── "Employee": attendance:read
   
4. User tries to access payroll:
   ├── ✅ Company has PAYROLL module enabled
   ├── ✅ User has payroll:read permission
   └── ✅ Access granted
   
5. User tries to access attendance:
   ├── ❌ Company has ATTENDANCE module disabled
   └── ❌ Access denied (even if user has permission)
```

## 🏗️ API Design

### Superadmin Company Management
```bash
# Create company + auto-create admin
POST /superadmin/companies
{
  "name": "ABC Corp",
  "subdomain": "abc",
  "adminEmail": "admin@abc.com", 
  "adminName": "John Admin"
}

# List all companies
GET /superadmin/companies?page=1&limit=10&search=abc

# Get company details + stats
GET /superadmin/companies/:companyId
{
  "id": "abc-corp-id",
  "name": "ABC Corp",
  "subdomain": "abc", 
  "isActive": true,
  "stats": {
    "userCount": 25,
    "activeUsers": 20,
    "modules": ["HRM", "PAYROLL"]
  },
  "adminUser": {
    "id": "admin-id", 
    "email": "admin@abc.com",
    "lastLoginAt": "2024-01-01"
  }
}

# Update company 
PATCH /superadmin/companies/:companyId
{
  "name": "ABC Corporation", 
  "isActive": false
}

# Enable/disable modules for company
POST /superadmin/companies/:companyId/modules
{
  "HRM": { "enabled": true },
  "PAYROLL": { "enabled": false },
  "ATTENDANCE": { "enabled": true, "settings": { "gracePeriod": 15 } }
}
```

### Superadmin User Management  
```bash
# List all users across companies
GET /superadmin/users?companyId=abc&page=1

# Reset any user password
POST /superadmin/users/:userId/reset-password
{
  "newPassword": "TempPass123!",
  "forceChange": true
}

# Force user logout
POST /superadmin/users/:userId/force-logout
```

## 🔒 Guards & Decorators

### 1. SuperadminGuard
```typescript
@Injectable()
export class SuperadminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    
    // Check if user has superadmin role
    return user?.roleIds?.includes('superadmin') || false;
  }
}
```

### 2. TenantResolver (Middleware)
```typescript
@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    
    // Priority 1: JWT payload
    if (user?.companyId) {
      req.tenantId = user.companyId;
    }
    // Priority 2: Subdomain
    else if (req.hostname.includes('.myerp.com')) {
      const subdomain = req.hostname.split('.')[0];
      req.tenantId = await this.getCompanyIdBySubdomain(subdomain);
    }
    // Priority 3: Header
    else if (req.headers['x-company-id']) {
      req.tenantId = req.headers['x-company-id'];
    }
    
    next();
  }
}
```

### 3. ModuleGuard
```typescript
@Injectable() 
export class ModuleGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const requiredModule = this.reflector.get('module', context.getHandler());
    
    if (!requiredModule) return true;
    
    // Check if company has module enabled
    const companyModule = await this.prisma.companyModule.findFirst({
      where: {
        companyId: req.tenantId,
        module: requiredModule,
        enabled: true
      }
    });
    
    return !!companyModule;
  }
}

// Usage:
@Get('/payroll')
@RequireModule('PAYROLL')
@RequirePermissions('payroll:read')
getPayroll() { ... }
```

## 🚀 Implementation Order

### Phase 1: Foundation
1. ✅ Update Prisma schema (Company, CompanyModule)
2. ✅ Create superadmin module structure
3. ✅ Implement SuperadminGuard

### Phase 2: Company Management
1. ✅ Company CRUD APIs
2. ✅ Company module management
3. ✅ Company admin creation

### Phase 3: Tenant Context
1. ✅ TenantResolver middleware
2. ✅ @Tenant() decorator  
3. ✅ TenantGuard

### Phase 4: Module System
1. ✅ ModuleGuard
2. ✅ @RequireModule() decorator
3. ✅ Module toggle APIs

Ready to implement this design?