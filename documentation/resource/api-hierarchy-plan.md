# 🏗️ API Hierarchy & Development Plan

## 👑 3-Level System Hierarchy

```
🌟 SUPERADMIN (Global)
├── Manages all companies
├── Creates company admins
├── Can reset ANY user password
├── Enable/disable companies
└── Full system access

🏢 COMPANY ADMIN (Company Scope)
├── Manages their company users only
├── Creates roles/permissions for their company
├── Can reset their company user passwords
├── Company settings
└── Cannot access other companies

👤 REGULAR USER (Self + Role Permissions)
├── Self-service (profile, password)
├── Access based on assigned role permissions
├── Cannot manage other users
└── Company-scoped access only
```

---

# 🎯 API Structure We'll Build

## 1. 🌟 SUPERADMIN APIs (`/superadmin/*`)

### Company Management
```bash
# Create new company + auto-create company admin
POST /superadmin/companies
{
  "name": "ABC Corp",
  "subdomain": "abc", 
  "adminEmail": "admin@abc.com",
  "adminName": "John Admin"
}
# Creates: Company + Company Admin User

# List all companies
GET /superadmin/companies
[
  {
    "id": "abc-corp-id",
    "name": "ABC Corp", 
    "subdomain": "abc",
    "isActive": true,
    "adminEmail": "admin@abc.com",
    "userCount": 25,
    "createdAt": "2024-01-01"
  }
]

# Get company details
GET /superadmin/companies/abc-corp-id

# Update company status  
PATCH /superadmin/companies/abc-corp-id
{
  "isActive": false  # Disable entire company
}

# Delete company (dangerous)
DELETE /superadmin/companies/abc-corp-id
```

### Global User Management
```bash
# List ALL users across ALL companies
GET /superadmin/users?companyId=abc-corp-id&page=1

# Reset ANY user password
POST /superadmin/users/user-id/reset-password
{
  "newPassword": "TempPass123!"
}

# Force logout user from all sessions
POST /superadmin/users/user-id/force-logout

# Get user details across companies
GET /superadmin/users/user-id
```

### System Settings
```bash
# Enable/disable modules globally
POST /superadmin/system/modules
{
  "module": "PAYROLL",
  "enabledForNewCompanies": true
}
```

---

## 2. 🏢 COMPANY ADMIN APIs (`/admin/*`)

### User Management (Company Scoped)
```bash
# List company users only
GET /admin/users

# Create user in their company
POST /admin/users
{
  "email": "employee@abc.com",
  "name": "Jane Employee",
  "roleId": "hr-manager-role-id"  # Optional
}

# Update user in their company
PATCH /admin/users/user-id
{
  "name": "Jane Updated",
  "isActive": false
}

# Reset company user password
POST /admin/users/user-id/reset-password

# Delete company user
DELETE /admin/users/user-id
```

### Role & Permission Management
```bash
# Get permission templates (what they can assign)
GET /admin/permission-templates
{
  "categories": [
    {
      "name": "Employee Management",
      "permissions": [
        {
          "id": "employees:read",
          "humanName": "View employee list",
          "description": "Can see all employees"
        }
      ]
    }
  ]
}

# Create role for their company
POST /admin/roles
{
  "name": "HR Assistant",
  "permissions": ["employees:read", "employees:create"]
}

# List company roles
GET /admin/roles

# Assign role to user
POST /admin/users/user-id/roles
{
  "roleId": "hr-assistant-role-id"
}
```

### Company Settings
```bash
# Get their company settings
GET /admin/company/settings

# Update company modules
PATCH /admin/company/modules
{
  "HRM": { "enabled": true },
  "PAYROLL": { "enabled": false }
}
```

---

## 3. 👤 USER SELF-SERVICE APIs (`/me/*`)

### Profile Management
```bash
# Get my profile
GET /me/profile

# Update my profile
PATCH /me/profile
{
  "name": "Updated Name",
  "phone": "+1234567890"
}

# Change my password
POST /me/change-password
{
  "currentPassword": "oldpass",
  "newPassword": "newpass"
}

# Get my permissions
GET /me/permissions
[
  "employees:read",
  "payroll:read"
]

# Logout from current session
POST /me/logout

# Logout from all sessions
POST /me/logout-all
```

---

# 🚀 Development Order (What to Build First)

## Phase 1: Foundation (Superadmin Level)
```
✅ Already done: Auth system, JWT, basic user model
🔄 Next: Company model + Superadmin company management
```

**APIs to build first:**
1. `POST /superadmin/companies` - Create company + admin
2. `GET /superadmin/companies` - List all companies  
3. `GET /superadmin/companies/:id` - Company details
4. `PATCH /superadmin/companies/:id` - Update company

## Phase 2: Company Admin Level
**APIs to build second:**
1. `GET /admin/users` - List company users
2. `POST /admin/users` - Create company user
3. `GET /admin/permission-templates` - Available permissions
4. `POST /admin/roles` - Create company role
5. `POST /admin/users/:id/roles` - Assign role

## Phase 3: User Self-Service
**APIs to build third:**
1. `GET /me/profile` - User profile
2. `PATCH /me/profile` - Update profile  
3. `POST /me/change-password` - Change password

## Phase 4: Advanced Features
1. Password reset flows
2. Audit logs
3. Advanced permissions
4. Module toggles

---

# 🎯 First Implementation: Company Management

**Should we start with:**

### Option A: Superadmin Company Creation
```bash
POST /superadmin/companies
{
  "name": "ABC Corp",
  "subdomain": "abc",
  "adminEmail": "admin@abc.com", 
  "adminName": "John Admin"
}

# This creates:
# 1. Company record
# 2. Company admin user  
# 3. Default "Company Admin" role
# 4. Links admin to role
```

### Option B: Company Registration (Self-Service)
```bash
POST /companies/register
{
  "companyName": "ABC Corp",
  "subdomain": "abc",
  "adminEmail": "admin@abc.com",
  "adminName": "John Admin", 
  "password": "TempPass123!"
}

# Self-service company creation
```

---

# ❓ Questions for You:

1. **Should superadmin create companies manually, or allow self-registration?**

2. **Should we start with superadmin APIs first?** (More control)

3. **What about tenant context?** - How do we know which company a request belongs to?
   - From subdomain: `abc.myerp.com`  
   - From header: `X-Company-Id: abc-corp-id`
   - From JWT payload: `companyId`

**Which approach feels right to you?** Then I'll implement exactly that!