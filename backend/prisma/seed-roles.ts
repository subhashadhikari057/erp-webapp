import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Business role definitions - THIS IS WHERE WE KEEP ROLE DECISIONS
const BUSINESS_ROLES = [
  {
    name: 'hr_manager',
    description: 'HR Manager with employee and leave management access',
    permissions: [
      // Employee Management
      'employees:read', 'employees:create', 'employees:update',
      
      // Leave Management  
      'leaves:read', 'leaves:approve', 'leaves:cancel',
      
      // Attendance & Reports
      'attendance:read', 'attendance:reports',
      'reports:hr',
      
      // Limited User Management
      'users:read',
    ],
  },
  
  {
    name: 'payroll_specialist', 
    description: 'Payroll processing and financial reporting specialist',
    permissions: [
      // Payroll Operations
      'payroll:read', 'payroll:process', 'payroll:update',
      'payslips:generate',
      
      // Employee Data (read-only for payroll)
      'employees:read',
      
      // Financial Reports
      'reports:financial',
      
      // Attendance (for payroll calculations)
      'attendance:read',
    ],
  },
  
  {
    name: 'department_manager',
    description: 'Department manager with team oversight responsibilities', 
    permissions: [
      // Team Management
      'employees:read',
      
      // Leave Approval
      'leaves:read', 'leaves:approve',
      
      // Team Attendance
      'attendance:read', 'attendance:reports',
      
      // Department Reports
      'reports:hr', 'reports:attendance',
    ],
  },
  
  {
    name: 'employee',
    description: 'Standard employee with self-service access',
    permissions: [
      // Self-service Leave
      'leaves:read', 'leaves:apply',
      
      // Self-service Attendance
      'attendance:read', 'attendance:mark',
    ],
  },
  
  {
    name: 'accountant',
    description: 'Financial reporting and payroll oversight',
    permissions: [
      // Financial Access
      'payroll:read', 'reports:financial',
      
      // Employee Data (for financial purposes)
      'employees:read',
      
      // System Reports
      'reports:export',
    ],
  },
  
  {
    name: 'system_admin',
    description: 'Technical system administrator',
    permissions: [
      // System Management
      'system:config', 'system:backup', 'system:logs', 'system:maintenance',
      
      // User & Role Management
      'users:read', 'users:create', 'users:update', 'users:delete',
      'roles:read', 'roles:create', 'roles:update', 'roles:delete', 'roles:assign',
      
      // Full Reporting
      'reports:financial', 'reports:hr', 'reports:attendance', 'reports:export',
    ],
  },
];

async function seedBusinessRoles(companyId: string) {
  console.log(`🏢 Seeding business roles for company: ${companyId}`);

  for (const roleDefinition of BUSINESS_ROLES) {
    console.log(`  📝 Creating role: ${roleDefinition.name}`);
    
    // 1. Create the role
    const role = await prisma.role.upsert({
      where: {
        role_name_company_unique: {
          name: roleDefinition.name,
          companyId: companyId,
        },
      },
      update: {
        description: roleDefinition.description,
      },
      create: {
        name: roleDefinition.name,
        description: roleDefinition.description,
        companyId: companyId,
      },
    });

    // 2. Assign permissions to the role
    for (const permissionName of roleDefinition.permissions) {
      const permission = await prisma.permission.findUnique({
        where: { name: permissionName },
      });

      if (permission) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId_companyId: {
              roleId: role.id,
              permissionId: permission.id,
              companyId: companyId,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permission.id,
            companyId: companyId,
          },
        });
      } else {
        console.warn(`    ⚠️  Permission not found: ${permissionName}`);
      }
    }
    
    console.log(`    ✅ Role ${roleDefinition.name} created with ${roleDefinition.permissions.length} permissions`);
  }

  console.log('✅ Business roles seeded successfully!');
}

// Run if called directly
if (require.main === module) {
  const companyId = process.argv[2] || 'global';
  seedBusinessRoles(companyId)
    .catch((e) => {
      console.error('❌ Error seeding business roles:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedBusinessRoles, BUSINESS_ROLES };