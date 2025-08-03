# 🎓 Permission System Tutorial

## How Permissions Work - Step by Step

### 1. **The Decorator** 
```typescript
@RequirePermissions('users:read')
```
**What it does:** Tells the system "this endpoint needs users:read permission"

### 2. **The Guards**
```typescript
@UseGuards(JwtGuard, RoleGuard)
```
**What they do:**
- `JwtGuard`: Checks if JWT token is valid → Extracts user info
- `RoleGuard`: Checks if user has required permission → Allows/denies access

### 3. **The Permission Check**
```typescript
// In RoleGuard, this happens:
const requiredPermissions = ['users:read'];           // From decorator
const userPermissions = user.permissions;             // From JWT token
const hasPermission = userPermissions.includes('users:read'); // Check

if (hasPermission) {
  return true;  // ✅ Access granted
} else {
  throw new ForbiddenException('Access denied'); // ❌ 403 error
}
```

### 4. **Where Permissions Come From**
```typescript
// When user logs in:
1. Database query gets user's roles
2. Database query gets roles' permissions  
3. Permissions go into JWT token
4. Every API call includes these permissions
5. Guards check permissions on every request
```

## Real Example Flow

### Login Process:
```
User Login → Database Query → Extract Permissions → Put in JWT
```

```sql
-- Database queries during login:
SELECT r.*, rp.*, p.* 
FROM users u
JOIN user_roles ur ON u.id = ur.user_id  
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.email = 'john@company.com'

-- Result: ['users:read', 'users:create', 'payroll:view']
```

### API Request Process:
```
API Request → Extract JWT → Check Permissions → Allow/Deny
```

```typescript
// What happens on API call:
1. Extract JWT token from request header
2. Decode JWT → get user.permissions = ['users:read', 'users:create']  
3. Check required permission: 'users:read'
4. user.permissions.includes('users:read') → true ✅
5. Execute endpoint
```

## How to Create Your Own Permissions

### Step 1: Create Permission in Database
```typescript
await prisma.permission.create({
  data: {
    name: 'inventory:manage',
    description: 'Manage inventory items', 
    category: 'INVENTORY'
  }
});
```

### Step 2: Assign Permission to Role
```typescript
await prisma.rolePermission.create({
  data: {
    roleId: 'manager-role-id',
    permissionId: 'inventory-permission-id',
    companyId: 'company-123'
  }
});
```

### Step 3: Use Permission in Controller
```typescript
@UseGuards(JwtGuard, RoleGuard)
@RequirePermissions('inventory:manage')
@Post('inventory/items')
async createInventoryItem() {
  // Only users with inventory:manage permission can access
}
```

### Step 4: Assign Role to User
```typescript
await prisma.userRole.create({
  data: {
    userId: 'john-doe-id',
    roleId: 'manager-role-id', 
    companyId: 'company-123'
  }
});
```

## Testing Permissions

### Test 1: User WITH Permission
```bash
# User has 'users:read' permission
curl -H "Authorization: Bearer valid-jwt" /users/admin/list
# Result: ✅ 200 OK - Access granted
```

### Test 2: User WITHOUT Permission  
```bash
# User doesn't have 'users:delete' permission
curl -H "Authorization: Bearer valid-jwt" /users/admin/delete/123
# Result: ❌ 403 Forbidden - Access denied
```

### Test 3: No Token
```bash
# No authorization header
curl /users/admin/list
# Result: ❌ 401 Unauthorized
```

## Common Permission Patterns

### Admin Only:
```typescript
@RequirePermissions('system:admin')
@Delete('dangerous-operation')
```

### Multiple Permissions (OR logic):
```typescript
@RequirePermissions('users:create', 'users:update') // User needs ONE of these
@Post('users')
```

### Business Logic Permissions:
```typescript
@RequirePermissions('payroll:process')
@Post('payroll/run')

@RequirePermissions('reports:financial') 
@Get('reports/revenue')

@RequirePermissions('employees:manage')
@Put('employees/:id')
```

## Error Messages

### 401 Unauthorized (No JWT):
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden (No Permission):
```json
{
  "statusCode": 403, 
  "message": "Access denied. Required permission(s): users:delete"
}
```

## Best Practices

1. **Use Descriptive Names:** `inventory:manage` not `inv_mgmt`
2. **Group by Category:** `users:read`, `users:create`, `users:delete`
3. **Be Specific:** `payroll:process` not `payroll:all`
4. **Test Both Cases:** With and without permissions
5. **Document Permissions:** What each permission allows

## Security Benefits

✅ **Granular Control:** Each endpoint can have specific permissions
✅ **Multi-tenant Safe:** Permissions scoped per company  
✅ **Audit Trail:** All permission checks logged
✅ **Flexible:** Easy to add/remove permissions
✅ **Type Safe:** Database-enforced permission validation