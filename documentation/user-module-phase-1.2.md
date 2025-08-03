# 👤 User Module Documentation - Phase 1.2

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [API Endpoints](#api-endpoints)
4. [Profile Management](#profile-management)
5. [Session Management](#session-management)
6. [Security Features](#security-features)
7. [Decorators & Middleware](#decorators--middleware)
8. [Data Transfer Objects](#data-transfer-objects)
9. [Database Schema](#database-schema)
10. [Error Handling](#error-handling)
11. [Audit & Analytics](#audit--analytics)
12. [Improvements](#improvements)

---

## 🎯 Overview

The User Module provides comprehensive user profile management, session control, and audit capabilities for authenticated users. It works seamlessly with the Auth Module to provide complete user lifecycle management with security-first design principles.

### Key Features
- ✅ **Profile Management** - Update name, email, phone
- ✅ **Password Management** - Secure password changes with validation
- ✅ **Session Control** - View, manage, and terminate user sessions
- ✅ **Audit Trail** - Access authentication logs and security events
- ✅ **Role-based Authorization** - Permission-driven access control
- ✅ **Multi-tenant Support** - Company-scoped user operations
- ✅ **Security Decorators** - Custom middleware for user context

---

## 🏗️ Architecture

### User Profile Management Flow
```mermaid
sequenceDiagram
    participant Client
    participant JwtGuard
    participant UserController
    participant UserService
    participant Database
    
    Client->>JwtGuard: GET /users/profile<br/>Authorization: Bearer token
    JwtGuard->>JwtGuard: Validate JWT
    JwtGuard->>UserController: Request with user context
    
    UserController->>UserService: getProfile(userId)
    UserService->>Database: findUser(userId)
    Database-->>UserService: User data
    UserService-->>UserController: Sanitized profile
    UserController-->>Client: Profile response
```

### Session Management Architecture
```mermaid
flowchart TD
    User[👤 User Login] --> CreateSession[📱 Create Session]
    CreateSession --> SessionData[💾 Store Session Data<br/>• Device Info<br/>• IP Address<br/>• User Agent<br/>• Refresh Token Hash]
    
    SessionData --> ActiveSessions[📋 Active Sessions List]
    ActiveSessions --> ManageSessions{🛠️ Session Actions}
    
    ManageSessions --> ViewAll[👁️ View All Sessions]
    ManageSessions --> Logout[🚪 Logout Current]
    ManageSessions --> LogoutAll[🚫 Logout All Devices]
    ManageSessions --> LogoutOthers[🔄 Logout Other Devices]
    
    ViewAll --> ShowSessions[📱💻📟 Show Device List]
    Logout --> RevokeOne[❌ Revoke Single Session]
    LogoutAll --> RevokeAll[❌ Revoke All Sessions]
    LogoutOthers --> RevokeOthers[❌ Keep Current Only]
    
    style User fill:#e3f2fd
    style CreateSession fill:#4caf50,stroke:#fff,color:#fff
    style ActiveSessions fill:#ffeb3b,stroke:#333,color:#333
    style RevokeOne fill:#f44336,stroke:#fff,color:#fff
    style RevokeAll fill:#f44336,stroke:#fff,color:#fff
    style RevokeOthers fill:#ff9800,stroke:#fff,color:#fff
```

### Multi-Device Security Model
```mermaid
graph TB
    Login[🔐 User Login] --> Device1[📱 Mobile Device]
    Login --> Device2[💻 Laptop Browser]
    Login --> Device3[🖥️ Desktop App]
    
    Device1 --> Session1[📋 Session 1<br/>Mobile iOS<br/>IP: 192.168.1.10]
    Device2 --> Session2[📋 Session 2<br/>Chrome Browser<br/>IP: 10.0.0.50]
    Device3 --> Session3[📋 Session 3<br/>Desktop App<br/>IP: 172.16.0.100]
    
    Session1 --> Token1[🔑 Refresh Token 1]
    Session2 --> Token2[🔑 Refresh Token 2]
    Session3 --> Token3[🔑 Refresh Token 3]
    
    Token1 --> Secure1[🔒 Secure Storage<br/>Hash in DB]
    Token2 --> Secure2[🔒 Secure Storage<br/>Hash in DB]
    Token3 --> Secure3[🔒 Secure Storage<br/>Hash in DB]
    
    User[👤 User] --> ViewSessions[👁️ View All Sessions]
    ViewSessions --> SessionList[📋 Session Management]
    SessionList --> LogoutDevice[🚪 Logout Specific Device]
    
    style Login fill:#e1f5fe
    style User fill:#e1f5fe
    style Session1 fill:#4caf50,stroke:#fff,color:#fff
    style Session2 fill:#4caf50,stroke:#fff,color:#fff
    style Session3 fill:#4caf50,stroke:#fff,color:#fff
    style LogoutDevice fill:#f44336,stroke:#fff,color:#fff
```

### Module Structure
```
users/
├── user.controller.ts      # HTTP endpoints for user operations
├── user.service.ts         # Business logic and database operations
├── user.module.ts          # Module configuration and dependencies
└── dto/
    ├── update-profile.dto.ts # Profile update validation
    └── change-password.dto.ts # Password change validation

common/
├── decorators/
│   ├── current-user.decorator.ts # Extract user from JWT
│   └── roles.decorator.ts        # Role-based authorization
└── guards/
    └── role.guard.ts            # Role validation middleware
```

### Dependencies
- **Auth Module** - JWT authentication and session management
- **Prisma Service** - Database operations for user data
- **bcryptjs** - Secure password hashing and comparison
- **NestJS Validators** - Input validation and sanitization

### Module Registration
```typescript
@Module({
  controllers: [UserController],
  providers: [UserService, PrismaService],
  exports: [UserService],
})
export class UserModule {}
```

---

## 🚀 API Endpoints

### 1. **GET /users/me**
Get current user's profile information including roles.

**Request:**
```http
GET /users/me
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "id": "user-uuid-123",
  "email": "john.doe@company.com",
  "name": "John Doe",
  "phone": "1234567890",
  "companyId": "company-uuid-456",
  "isActive": true,
  "lastLoginAt": "2025-01-02T10:30:00.000Z",
  "roles": [
    {
      "id": "role-uuid-789",
      "name": "Manager"
    },
    {
      "id": "role-uuid-101",
      "name": "Employee"
    }
  ]
}
```

**Security Features:**
- ✅ JWT authentication required
- ✅ User-specific data only
- ✅ Flattened role structure for easy consumption
- ✅ Excludes sensitive fields (password, tokenVersion)

### 2. **PATCH /users/me**
Update current user's profile information.

**Request:**
```json
{
  "name": "John Smith",
  "email": "john.smith@company.com",
  "phone": "9876543210"
}
```

**Response:**
```json
{
  "id": "user-uuid-123",
  "email": "john.smith@company.com",
  "name": "John Smith",
  "phone": "9876543210",
  "companyId": "company-uuid-456",
  "isActive": true,
  "lastLoginAt": "2025-01-02T10:30:00.000Z"
}
```

**Validations:**
- ✅ **Email Uniqueness** - Prevents duplicate emails within company
- ✅ **PATCH Semantics** - Only updates provided fields
- ✅ **Phone Format** - Validates 10-digit phone numbers
- ✅ **Email Format** - Standard email validation

### 3. **POST /users/me/change-password**
Change current user's password with security validations.

**Request:**
```json
{
  "currentPassword": "currentSecurePass123",
  "newPassword": "newSecurePass456"
}
```

**Response:**
```json
{
  "message": "Password changed successfully."
}
```

**Security Features:**
- ✅ **Current Password Verification** - Prevents unauthorized changes
- ✅ **Password Strength** - Minimum 8 characters for new password
- ✅ **Token Invalidation** - Increments tokenVersion to revoke existing JWTs
- ✅ **bcrypt Hashing** - Secure password storage
- ✅ **Same Password Prevention** - Blocks reusing current password

### 4. **GET /users/me/audit-logs**
Retrieve user's authentication audit logs with pagination.

**Request:**
```http
GET /users/me/audit-logs?page=1
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "data": [
    {
      "id": "log-uuid-123",
      "type": "LOGIN",
      "success": true,
      "ip": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "timestamp": "2025-01-02T10:30:00.000Z"
    },
    {
      "id": "log-uuid-124",
      "type": "FAIL",
      "success": false,
      "ip": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "timestamp": "2025-01-02T10:25:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 5,
  "total": 42,
  "totalPages": 9
}
```

**Features:**
- ✅ **Pagination Support** - 5 logs per page by default
- ✅ **Chronological Order** - Newest events first
- ✅ **Security Analytics** - IP and device tracking
- ✅ **Event Types** - LOGIN, LOGOUT, FAIL events

### 5. **GET /users/me/sessions**
Get all active sessions for the current user.

**Request:**
```http
GET /users/me/sessions
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
[
  {
    "id": "session-uuid-123",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "ip": "192.168.1.100",
    "createdAt": "2025-01-02T09:00:00.000Z",
    "lastSeenAt": "2025-01-02T10:30:00.000Z",
    "isActive": true,
    "revokedAt": null
  },
  {
    "id": "session-uuid-124",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
    "ip": "10.0.0.5",
    "createdAt": "2025-01-01T15:30:00.000Z",
    "lastSeenAt": "2025-01-02T08:45:00.000Z",
    "isActive": true,
    "revokedAt": null
  }
]
```

**Features:**
- ✅ **Multi-device Support** - Shows all active sessions
- ✅ **Device Information** - User-Agent and IP tracking
- ✅ **Activity Tracking** - Last seen timestamps
- ✅ **Security Overview** - Monitor unauthorized access

### 6. **DELETE /users/me/sessions**
Logout from all active sessions (terminate all devices).

**Request:**
```http
DELETE /users/me/sessions
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out from 3 active sessions",
  "sessionsRevoked": 3
}
```

**Use Cases:**
- 🔐 **Security Breach Response** - Immediately revoke all access
- 📱 **Device Lost/Stolen** - Terminate unauthorized sessions
- 🔄 **Password Changed** - Force re-authentication everywhere

### 7. **DELETE /users/me/sessions/:sessionId**
Terminate a specific session by ID.

**Request:**
```http
DELETE /users/me/sessions/session-uuid-123
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```json
{
  "success": true,
  "message": "Session terminated successfully"
}
```

**Security Features:**
- ✅ **User Ownership Validation** - Only terminate own sessions
- ✅ **Session Existence Check** - Validates session exists
- ✅ **Active Status Check** - Prevents duplicate termination

---

## 👤 Profile Management

### Profile Update Flow
```mermaid
graph TD
    A[User Updates Profile] --> B[Validate Input]
    B --> C{Email Changed?}
    C -->|Yes| D[Check Email Uniqueness]
    C -->|No| F[Update Database]
    D --> E{Email Unique?}
    E -->|Yes| F[Update Database]
    E -->|No| G[Return Error]
    F --> H[Return Updated Profile]
    G --> I[BadRequestException]
```

### Profile Data Structure
```typescript
interface UserProfile {
  id: string;           // Unique user identifier
  email: string;        // Contact email (unique per company)
  name?: string;        // Display name
  phone?: string;       // Contact phone (10 digits)
  companyId: string;    // Multi-tenant isolation
  isActive: boolean;    // Account status
  lastLoginAt: Date?;   // Last authentication time
  roles: Role[];        // Assigned roles with permissions
}
```

### Update Validation Rules
- **Email**: Valid format, unique within company
- **Phone**: Exactly 10 digits, optional
- **Name**: String, optional
- **Security**: Only authenticated users can update own profile

---

## 🔐 Session Management

### Session Overview Dashboard
Users can monitor and control their active sessions across all devices:

```typescript
interface SessionInfo {
  id: string;           // Session identifier
  userAgent: string;    // Browser/device information
  ip: string;           // Connection IP address
  createdAt: Date;      // Session start time
  lastSeenAt: Date;     // Last activity timestamp
  isActive: boolean;    // Current session status
  revokedAt?: Date;     // Termination time
}
```

### Session Control Actions
1. **View All Sessions** - Monitor active devices and locations
2. **Terminate Specific Session** - Remove access from single device
3. **Logout Everywhere** - Revoke all sessions for security

### Security Benefits
- **Unauthorized Access Detection** - Unknown devices/locations
- **Remote Session Management** - Control access without device access
- **Security Incident Response** - Immediate threat mitigation

---

## 🛡️ Security Features

### Authentication Layer
- **JWT Required** - All endpoints require valid access token
- **User Context** - Automatic user extraction from token
- **Token Validation** - Signature verification with RSA public key

### Authorization Layer
```typescript
// Role-based access control (example usage)
@UseGuards(JwtGuard, RoleGuard)
@Roles('admin', 'manager')
@Get('admin-only-endpoint')
async adminOperation() {
  // Only accessible by admin or manager roles
}
```

### Data Security
- **User Isolation** - Users can only access own data
- **Password Security** - bcrypt hashing with salt rounds
- **Token Invalidation** - Password changes revoke existing tokens
- **Input Validation** - All inputs validated and sanitized

### Multi-tenant Security
- **Company Scoping** - All operations scoped to user's company
- **Data Isolation** - No cross-company data access
- **Role Segregation** - Roles unique per company

---

## 🎨 Decorators & Middleware

### 1. CurrentUser Decorator
Extracts authenticated user information from JWT token.

```typescript
// Implementation
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // JwtPayload from JWT strategy
  },
);

// Usage
@Get('me')
async getProfile(@CurrentUser() user: JwtPayload) {
  return this.userService.getBasicUserInfo(user.userId);
}
```

**Features:**
- ✅ **Type Safety** - Returns typed JwtPayload
- ✅ **Automatic Extraction** - No manual request parsing
- ✅ **Decorator Pattern** - Clean, reusable code

### 2. Roles Decorator
Defines required roles for endpoint access.

```typescript
// Implementation
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// Usage
@Roles('admin', 'manager')
@Delete('users/:id')
async deleteUser(@Param('id') userId: string) {
  // Only admin or manager can access
}
```

### 3. Role Guard
Enforces role-based access control.

```typescript
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) return true; // No roles required

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    const hasRole = user.roleIds.length > 0 && 
      requiredRoles.some(role => user.roleIds.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('You do not have the required role');
    }

    return true;
  }
}
```

**Security Features:**
- ✅ **Role Validation** - Checks user roles against requirements
- ✅ **Multiple Roles** - Supports OR logic (any required role)
- ✅ **Graceful Handling** - Clear error messages
- ✅ **Metadata Driven** - Declarative role assignment

### Guard Combination Pattern
```typescript
@UseGuards(JwtGuard, RoleGuard)
@Roles('admin')
@Post('sensitive-operation')
async sensitiveOperation(@CurrentUser() user: JwtPayload) {
  // 1. JwtGuard validates JWT token
  // 2. RoleGuard checks admin role
  // 3. CurrentUser extracts user info
  // 4. Method executes with full context
}
```

---

## 📊 Data Transfer Objects

### UpdateProfileDto
Profile update validation with optional fields.

```typescript
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'Phone must be exactly 10 digits.' })
  phone?: string;
}
```

**Validation Rules:**
- **All Optional** - PATCH semantics, update only provided fields
- **Email Format** - Standard email validation
- **Phone Pattern** - Exactly 10 digits required
- **String Types** - Prevents injection attacks

### ChangePasswordDto
Password change validation with security requirements.

```typescript
export class ChangePasswordDto {
  @IsString()
  @MinLength(6, { message: 'Current password is required and must be at least 6 characters.' })
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters.' })
  newPassword: string;
}
```

**Security Features:**
- **Current Password Required** - Prevents unauthorized changes
- **Minimum Length** - 8 characters for new passwords
- **Strength Validation** - Can be extended with complexity rules

### Response DTOs
```typescript
// User profile response
interface UserProfileResponse {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  companyId: string;
  isActive: boolean;
  lastLoginAt?: Date;
  roles: {
    id: string;
    name: string;
  }[];
}

// Audit log response
interface AuditLogResponse {
  data: {
    id: string;
    type: 'LOGIN' | 'LOGOUT' | 'FAIL';
    success: boolean;
    ip: string;
    userAgent: string;
    timestamp: Date;
  }[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
```

---

## 🗄️ Database Schema

### User-Related Models
The User Module primarily operates on these database models:

```mermaid
erDiagram
    User ||--o{ UserRole : has
    User ||--o{ AuthLog : generates
    User ||--o{ Session : owns
    Role ||--o{ UserRole : assigned_to
    
    User {
        string id PK
        string email UK
        string password
        string name
        string phone
        boolean isActive
        int tokenVersion
        string companyId
        datetime lastLoginAt
    }
    
    AuthLog {
        string id PK
        string userId FK
        string companyId
        string ip
        string userAgent
        AuthLogType type
        boolean success
        datetime timestamp
    }
    
    Session {
        string id PK
        string userId FK
        string companyId
        string userAgent
        string ip
        boolean isActive
        datetime createdAt
        datetime lastSeenAt
        datetime revokedAt
        string tokenHash
    }
```

### Key Database Operations

**Profile Management:**
```sql
-- Get user profile with roles
SELECT u.id, u.email, u.name, u.phone, u.companyId, u.isActive, u.lastLoginAt,
       r.id as role_id, r.name as role_name
FROM User u
LEFT JOIN UserRole ur ON u.id = ur.userId
LEFT JOIN Role r ON ur.roleId = r.id
WHERE u.id = ? AND u.companyId = ?;

-- Update user profile
UPDATE User 
SET name = ?, email = ?, phone = ?, updatedAt = NOW()
WHERE id = ? AND companyId = ?;
```

**Session Management:**
```sql
-- Get active sessions
SELECT id, userAgent, ip, createdAt, lastSeenAt, isActive, revokedAt
FROM Session
WHERE userId = ? AND isActive = true
ORDER BY lastSeenAt DESC;

-- Terminate all sessions
UPDATE Session 
SET isActive = false, revokedAt = NOW()
WHERE userId = ? AND isActive = true;
```

**Audit Logs:**
```sql
-- Get paginated audit logs
SELECT id, type, success, ip, userAgent, timestamp
FROM AuthLog
WHERE userId = ?
ORDER BY timestamp DESC
LIMIT ? OFFSET ?;
```

---

## 🛡️ Error Handling

### Validation Errors
```typescript
// Email uniqueness
throw new BadRequestException('Email is already in use.');

// Password mismatch
throw new ForbiddenException('Current password is incorrect.');

// Same password
throw new BadRequestException('New password cannot be same as current password.');

// User not found
throw new NotFoundException('User not found');

// Session ownership
throw new NotFoundException('Session not found or does not belong to you');
```

### Security Error Patterns
- **Generic Messages** - Avoid information leakage
- **Consistent Responses** - Same timing for success/failure
- **Appropriate Status Codes** - 400, 401, 403, 404 as applicable
- **Graceful Degradation** - Service continues on non-critical failures

### Error Response Format
```json
{
  "statusCode": 400,
  "message": "Email is already in use.",
  "error": "Bad Request"
}
```

---

## 📊 Audit & Analytics

### User Activity Tracking
- **Authentication Events** - Login, logout, failures
- **Profile Changes** - Email, name, phone updates
- **Password Changes** - Security event logging
- **Session Management** - Device access patterns

### Analytics Capabilities
```typescript
// Audit log analysis
interface UserAnalytics {
  totalLogins: number;
  failedAttempts: number;
  uniqueDevices: number;
  lastActiveDevices: SessionInfo[];
  securityEvents: {
    passwordChanges: number;
    allSessionLogouts: number;
    suspiciousActivity: AuthLog[];
  };
}
```

### Security Monitoring
- **Failed Login Attempts** - Potential brute force detection
- **Multiple Device Access** - Account sharing indicators
- **Geographic Patterns** - Unusual location access
- **Password Change Frequency** - Security hygiene metrics

---

## 🎯 Improvements

### Short-term Improvements
1. **Enhanced Profile Validation**
   - Password complexity requirements
   - Profile picture upload and management
   - Additional profile fields (timezone, language)
   - Email verification workflow

2. **Advanced Session Management**
   - Session naming/labeling by users
   - Trusted device management
   - Session expiration policies
   - Concurrent session limits

3. **Improved Analytics**
   - Login pattern analysis
   - Device fingerprinting
   - Geographic login tracking
   - Real-time security alerts

### Medium-term Improvements
1. **User Preferences**
   - Notification settings management
   - UI theme preferences
   - Language and localization
   - Privacy settings control

2. **Account Security**
   - Two-factor authentication setup
   - Security questions management
   - Account recovery workflows
   - Security breach notifications

3. **Administrative Features**
   - User export/import capabilities
   - Bulk user operations
   - Advanced user search and filtering
   - User lifecycle management

### Long-term Improvements
1. **Advanced Analytics Dashboard**
   - User behavior analytics
   - Security posture scoring
   - Compliance reporting
   - Advanced threat detection

2. **Integration Capabilities**
   - LDAP/Active Directory sync
   - Single Sign-On (SSO) support
   - External identity providers
   - API access management

3. **Compliance & Governance**
   - GDPR compliance tools
   - Data retention policies
   - Audit trail export
   - Regulatory reporting

---

## 📚 API Reference Quick Guide

### User Profile Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/me` | Get current user profile | JWT |
| PATCH | `/users/me` | Update profile information | JWT |
| POST | `/users/me/change-password` | Change user password | JWT |

### Session Management Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/me/sessions` | Get active sessions | JWT |
| DELETE | `/users/me/sessions` | Logout all sessions | JWT |
| DELETE | `/users/me/sessions/:id` | Terminate specific session | JWT |

### Audit & Analytics Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users/me/audit-logs` | Get authentication logs | JWT |

### Decorators & Guards
| Component | Purpose | Usage |
|-----------|---------|-------|
| `@CurrentUser()` | Extract user from JWT | Parameter decorator |
| `@Roles('admin')` | Require specific roles | Method decorator |
| `@UseGuards(RoleGuard)` | Enforce role requirements | Method decorator |
| `JwtGuard` | Validate JWT tokens | Method/Controller guard |

### Status Codes
- **200**: Success - Operation completed successfully
- **400**: Bad Request - Validation errors or business logic violations
- **401**: Unauthorized - Invalid or missing JWT token
- **403**: Forbidden - Insufficient permissions or role requirements
- **404**: Not Found - Resource doesn't exist or doesn't belong to user
- **500**: Internal Server Error - Unexpected server errors

---

This documentation covers the complete User Module implementation in Phase 1.2, providing comprehensive user management capabilities with security-first design principles and seamless integration with the Auth Module.