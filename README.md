<div align="center">

# 🏢 ERP Software Backend

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Status-In_Development-yellow?style=flat-square" alt="Status" />
  <img src="https://img.shields.io/badge/Version-1.0.0-blue?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square" alt="PRs Welcome" />
</p>

<p align="center">
  <strong>A scalable, modular, and multi-tenant ERP backend system tailored for Human Resource Management (HRM) and extendable to Finance, Procurement, CRM, and more.</strong>
</p>

<p align="center">
  Built using <strong>NestJS</strong>, <strong>Prisma</strong>, and <strong>PostgreSQL</strong>, following Domain-Driven Design (DDD) and designed for enterprise-grade security, RBAC, auditing, and tenant separation.
</p>

</div>

---

## 📦 Tech Stack

<div align="center">

| Category | Technology | Description |
|----------|------------|-------------|
| **🚀 Framework** | ![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white) | Modular Monolith Architecture |
| **🗄️ Database** | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white) | Production-ready RDBMS |
| **🔗 ORM** | ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white) | Type-safe database client |
| **🔐 Auth** | ![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white) | RS256 with refresh token rotation |
| **📝 Language** | ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white) | Type-safe development |
| **🐳 Deployment** | ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white) | Containerized deployment |
| **🛡️ Validation** | ![Zod](https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white) | Schema validation (per-DTO) |
| **🔍 Auditing** | ![Custom](https://img.shields.io/badge/Custom-28A745?style=flat-square&logo=checkmarx&logoColor=white) | Full actor tracking (IP, userAgent, before/after) |

</div>

### ✨ Key Features
- 🏢 **Multi-Tenancy**: Subdomain or header-based tenant context  
- 🔐 **RBAC**: Fine-grained role and permission control  
- 📊 **Auditing**: Complete change tracking with actor information  
- 🔄 **Scalable**: Modular architecture for easy expansion

---

## 🧱 Project Structure

```
erp-webapp/
└── backend/
    ├── prisma/           # Prisma schema and migrations
    ├── src/
    │   ├── modules/      # Feature modules (auth, user, employee, etc.)
    │   ├── common/       # Reusable utils, guards, interceptors
    │   ├── prisma/       # Prisma service for DB access
    │   └── config/       # Environment and config loading
    └── .env              # Environment variables (DB, secrets, etc.)
```

---

## 🚀 Getting Started

### 1. Clone the Repo

```bash
git clone https://github.com/yourusername/erp-webapp.git
cd erp-webapp/backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file based on `.env.example`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/erp_db"
JWT_PRIVATE_KEY="..."
JWT_PUBLIC_KEY="..."
```

### 4. Initialize Prisma

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Start the Server

```bash
npm run start:dev
```

---

## 📌 Features

✅ Multi-tenant via `companyId`  
✅ Role-based access with per-module control  
✅ Audit logs for all changes  
✅ JWT Auth (access + refresh with httpOnly cookies)  
✅ Modular, service/controller-driven architecture  
✅ Docker-ready and CI/CD friendly  

---

## 🗺️ Development Roadmap

### ⚙️ Phase 1: Core System Foundation
| Step | Module | What It Does |
|------|--------|--------------|
| 1.1 | NestJS Boilerplate | Project init, ConfigModule, Error filters, Global pipes |
| 1.2 | Prisma Setup | PostgreSQL, multi-tenant via companyId, Prisma Migrate |
| 1.3 | Auth Module | JWT (RS256) with refresh rotation, secure httpOnly cookies |
| 1.4 | Tenant Context | Resolve companyId from subdomain/header → @Tenant() decorator |
| 1.5 | RBAC System | Role, Permission, UserRole, RolePermission, @Roles() |
| 1.6 | Global Guards | JwtGuard, RoleGuard, TenantGuard, ModuleGuard |
| 1.7 | Audit Logs | Global audit_logs table with actorId, before/after, IP, UA |
| 1.8 | Security | Helmet, CORS, rate limiter, brute force login protection |

### 🏢 Phase 2: Organizational Structure Setup
| Step | Module | Models |
|------|--------|--------|
| 2.1 | Company Module | Company, CompanyModuleToggle |
| 2.2 | Department Module | Department scoped by companyId |
| 2.3 | Designation Module | Designation scoped by companyId |
| 2.4 | Branch Module (optional) | Branch / Location per company |
| 2.5 | Shift Management | WorkShift with timing, grace, break |
| 2.6 | Leave Type | LeaveType defined by company for later assignment |

**Purpose**: Enables assigning structure to employees (shift, dept, etc.)

### 👤 Phase 3: Employee Lifecycle Management
| Step | Module | Key Features |
|------|--------|--------------|
| 3.1 | Employee Core | Employee model with foreign keys (dept, shift, designation, userId) |
| 3.2 | Employment Dates | joinDate, exitDate → analytics on years worked |
| 3.3 | Linked User | User created with auto-password, RBAC roles, isActive, forcePasswordChange |
| 3.4 | EmployeeAuditLogs | Track every profile change by actor |
| 3.5 | SalaryHistory | Monthly/base salary tracking over time |
| 3.6 | Identity Upload | Document storage (ID, resume, photo, etc.) |
| 3.7 | Profile Info | DOB, gender, contact, emergency contact, etc. |
| 3.8 | Linked Shifts | Assign shift via relation table to support shift changes |

### 🕒 Phase 4: Time & Leave Management
| Step | Module | What It Does |
|------|--------|--------------|
| 4.1 | Attendance | Manual punch, punch time, shift validation, working hours |
| 4.2 | Late/Early Tracking | Auto from shift timings and grace period |
| 4.3 | Holiday Calendar | Per company, excludes from attendance/leave |
| 4.4 | Leave Balance | EmployeeLeaveBalance per leaveType |
| 4.5 | Leave Application | Requests, approval status, comment trail |
| 4.6 | Absence Tracking | Detect missing days and flag for payroll deduction |

### 💸 Phase 5: Payroll & Compensation
| Step | Module | Models |
|------|--------|--------|
| 5.1 | AllowanceType, DeductionType | Defined per company |
| 5.2 | EmployeeAllowance, Deduction | Assigned per employee |
| 5.3 | Incentives | One-time or repeating |
| 5.4 | Payroll Engine | Generate payslips with breakdown |
| 5.5 | Payslip Download | PDF or JSON per month |
| 5.6 | Salary Cut | Triggered by absence or policy |

### 🧠 Phase 6: Advanced HR (Optional but Extendable)
| Step | Module | Purpose |
|------|--------|---------|
| 6.1 | Appraisal System | Track KPIs, feedback, scoring |
| 6.2 | Recruitment | Job posting, application flow |
| 6.3 | Onboarding | Transition applicant to employee |
| 6.4 | Roster Scheduling | Weekly/monthly overrides per employee |

### 📱 Phase 7: Employee Self-Service (ESS)
| Step | Module | Purpose |
|------|--------|---------|
| 7.1 | /me API | Authenticated employee dashboard |
| 7.2 | Apply Leave | With balance validation |
| 7.3 | View Payslip | For own payroll history |
| 7.4 | Update Profile | Editable fields with audit |

### 📊 Phase 8: Reporting & Admin Tools
| Step | Module | Purpose |
|------|--------|---------|
| 8.1 | Admin Reporting | Headcount, attendance, payroll summaries |
| 8.2 | Export Tools | Export CSV/XLS by filters |
| 8.3 | Superadmin Tools | Create tenant, enable/disable modules |
| 8.4 | Announcement System | HR to post notices to company |
| 8.5 | Consent Tracking | Show privacy/terms and track accept history |

### 🚀 Phase 9: DevOps & Deployment
| Step | Tooling | What It Includes |
|------|---------|------------------|
| 9.1 | Docker | Compose setup for app + DB |
| 9.2 | CI/CD | GitHub Actions / GitLab pipeline |
| 9.3 | Seed CLI | Superadmin, roles, company creation |
| 9.4 | Environment | dev, stage, prod via ConfigModule |
| 9.5 | Postman Collection | Fully documented collection |
| 9.6 | Swagger Docs | Auto-generated + secured per tenant |

---

## 🎯 Final System Outcome

✅ **Fully Modular** (per-company toggles)  
✅ **Enterprise-Ready** (scalable, normalized schema)  
✅ **RBAC-Controlled & Audited** (every change logged)  
✅ **Ready for Expansion** (CRM, Finance, Procurement, etc.)  
✅ **SaaS Deployable** (Docker, Subdomain, or Header-based tenancy)  

---

<div align="center">

## 🧑‍💻 Author

<p align="center">
  <img src="https://img.shields.io/badge/Made_with_❤️_by-Subhash_Adhikari-red?style=for-the-badge" alt="Made with ❤️ by Subhash Pandit" />
</p>

<p align="center">
  <strong>Subhash Adhikari</strong><br/>
  Final Year BCS Student | Full Stack Developer
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-Expert-green?style=flat-square&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-Expert-blue?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-Expert-blue?style=flat-square&logo=typescript" alt="TypeScript" />
</p>

---

## 🛡️ License

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-brightgreen?style=for-the-badge&logo=opensourceinitiative&logoColor=white" alt="MIT License" />
</p>


<p align="center">
  <sub>⭐ Star this repo if you found it helpful! ⭐</sub>
</p>

</div>
