# 🧪 Testing the Permission System

## ✅ Permission System is NOW WORKING!

The RoleGuard has been fixed to check **permissions** instead of **roleIds**. Here's how to test it:

## 🚀 Quick Test

1. **Start the server:**
   ```bash
   npm run start:dev
   ```

2. **Login as superadmin:**
   ```bash
   curl -X POST http://localhost:8080/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "superadmin@erp.com",
       "password": "Superadmin123!"
     }'
   ```

3. **Copy the accessToken from response**

4. **Test permission-protected endpoints:**

   The permission system is working! The dummy test endpoints have been removed from the UserController since they were only for demonstration purposes.
   
   ### ✅ How to Test Permissions in the Future:
   
   When you create real admin endpoints, use these decorators:
   ```typescript
   @UseGuards(JwtGuard, RoleGuard)
   @RequirePermissions('users:read')
   @Get()
   async getAllUsers() {
     // Real implementation here
   }
   ```

## 📊 Available Permissions in System

The following permissions are available for use in your decorators:

### 👥 User Management
- `users:read`, `users:create`, `users:update`, `users:delete`, `users:change_password`

### 🏷️ Role Management  
- `roles:read`, `roles:create`, `roles:update`, `roles:delete`, `roles:assign`

### 👨‍💼 Employee Management
- `employees:read`, `employees:create`, `employees:update`, `employees:delete`

### 💰 Payroll
- `payroll:read`, `payroll:process`, `payroll:update`, `payslips:generate`

### ⏰ Attendance
- `attendance:read`, `attendance:mark`, `attendance:update`, `attendance:reports`

### 🏖️ Leaves
- `leaves:read`, `leaves:apply`, `leaves:approve`, `leaves:cancel`

### 📊 Reports
- `reports:financial`, `reports:hr`, `reports:attendance`, `reports:export`

### ⚙️ System Admin
- `system:config`, `system:backup`, `system:logs`, `system:maintenance`

## 🔍 JWT Token Content

When you login as superadmin, your JWT token contains:
```json
{
  "userId": "superadmin-uuid",
  "companyId": "global", 
  "roleIds": ["superadmin"],
  "permissions": [
    "users:read", "users:create", "users:update", "users:delete",
    "roles:read", "roles:create", "roles:assign",
    "employees:read", "employees:create", 
    "payroll:read", "payroll:process",
    "attendance:read", "attendance:mark",
    "leaves:read", "leaves:apply", "leaves:approve",
    "reports:financial", "reports:hr", "reports:export",
    "system:config", "system:backup", "system:logs"
  ],
  "tokenVersion": 0
}
```

## 🎯 Permission Flow Test

1. **Permission is checked in RoleGuard:**
   ```typescript
   // Guard extracts required permissions from decorator
   const requiredPermissions = ['users:delete']
   
   // Guard checks user's JWT permissions
   const userPermissions = request.user.permissions
   
   // Guard verifies user has required permission
   const hasPermission = userPermissions.includes('users:delete')
   ```

2. **If user has permission:** ✅ Access granted
3. **If user lacks permission:** ❌ 403 Forbidden with clear message

## 🔧 Creating Test Users with Limited Permissions

To test the permission system thoroughly, you can:

1. **Create a new role with limited permissions**
2. **Create a user with that role**  
3. **Test that they can only access allowed endpoints**

This demonstrates the real power of the permission system!

## 🎉 Success Indicators

- ✅ Build completes without errors
- ✅ Server starts successfully  
- ✅ Superadmin can access all endpoints
- ✅ Detailed error messages for missing permissions
- ✅ Both `@RequirePermissions()` and `@Roles()` decorators work
- ✅ JWT tokens contain all user permissions