import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPermissions() {
  console.log('🌱 Seeding permissions...');

  // Define categories and permissions for a typical ERP system
  const permissionCategories = [
    {
      category: 'USER_MANAGEMENT',
      permissions: [
        { name: 'users:read', description: 'View user profiles and information' },
        { name: 'users:create', description: 'Create new user accounts' },
        { name: 'users:update', description: 'Edit user profiles and settings' },
        { name: 'users:delete', description: 'Delete user accounts' },
        { name: 'users:change_password', description: 'Change user passwords' },
      ],
    },
    {
      category: 'ROLE_MANAGEMENT',
      permissions: [
        { name: 'roles:read', description: 'View roles and permissions' },
        { name: 'roles:create', description: 'Create new roles' },
        { name: 'roles:update', description: 'Edit role permissions' },
        { name: 'roles:delete', description: 'Delete roles' },
        { name: 'roles:assign', description: 'Assign roles to users' },
      ],
    },
    {
      category: 'EMPLOYEE_MANAGEMENT',
      permissions: [
        { name: 'employees:read', description: 'View employee records' },
        { name: 'employees:create', description: 'Add new employees' },
        { name: 'employees:update', description: 'Edit employee information' },
        { name: 'employees:delete', description: 'Remove employee records' },
      ],
    },
    {
      category: 'PAYROLL',
      permissions: [
        { name: 'payroll:read', description: 'View payroll information' },
        { name: 'payroll:process', description: 'Process monthly payroll' },
        { name: 'payroll:update', description: 'Edit payroll details' },
        { name: 'payslips:generate', description: 'Generate employee payslips' },
      ],
    },
    {
      category: 'ATTENDANCE',
      permissions: [
        { name: 'attendance:read', description: 'View attendance records' },
        { name: 'attendance:mark', description: 'Mark attendance for employees' },
        { name: 'attendance:update', description: 'Edit attendance records' },
        { name: 'attendance:reports', description: 'Generate attendance reports' },
      ],
    },
    {
      category: 'LEAVES',
      permissions: [
        { name: 'leaves:read', description: 'View leave applications' },
        { name: 'leaves:apply', description: 'Apply for leave' },
        { name: 'leaves:approve', description: 'Approve/reject leave applications' },
        { name: 'leaves:cancel', description: 'Cancel leave applications' },
      ],
    },
    {
      category: 'REPORTS',
      permissions: [
        { name: 'reports:financial', description: 'Access financial reports' },
        { name: 'reports:hr', description: 'Access HR reports' },
        { name: 'reports:attendance', description: 'Access attendance reports' },
        { name: 'reports:export', description: 'Export reports to files' },
      ],
    },
    {
      category: 'SYSTEM_ADMIN',
      permissions: [
        { name: 'system:config', description: 'Configure system settings' },
        { name: 'system:backup', description: 'Create system backups' },
        { name: 'system:logs', description: 'View system logs' },
        { name: 'system:maintenance', description: 'Perform system maintenance' },
      ],
    },
  ];

  // Create permissions
  for (const category of permissionCategories) {
    console.log(`  📝 Creating ${category.category} permissions...`);
    
    for (const permission of category.permissions) {
      await prisma.permission.upsert({
        where: { name: permission.name },
        update: {
          description: permission.description,
          category: category.category,
        },
        create: {
          name: permission.name,
          description: permission.description,
          category: category.category,
        },
      });
    }
  }

  console.log('✅ Permissions seeded successfully!');
}

// Run if called directly
if (require.main === module) {
  seedPermissions()
    .catch((e) => {
      console.error('❌ Error seeding permissions:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedPermissions };