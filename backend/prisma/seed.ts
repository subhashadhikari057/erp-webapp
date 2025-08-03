import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const SUPERADMIN_COMPANY_ID = 'global'; // fixed value for now
  const SUPERADMIN_ROLE_ID = 'superadmin'; // same as used in token payload

  console.log('🌱 Seeding superadmin user and role...');

  // 1. Create superadmin role if not exists
  const role = await prisma.role.upsert({
    where: {
      role_name_company_unique: {
        name: 'superadmin',
        companyId: SUPERADMIN_COMPANY_ID,
      },
    },
    update: {
      description: 'System superadmin with full access to all features',
    },
    create: {
      id: SUPERADMIN_ROLE_ID,
      name: 'superadmin',
      description: 'System superadmin with full access to all features',
      companyId: SUPERADMIN_COMPANY_ID,
    },
  });

  // 2. Create superadmin user
  const password = await bcrypt.hash('Superadmin123!', 10);

  const user = await prisma.user.upsert({
    where: { email: 'superadmin@erp.com' },
    update: {},
    create: {
      email: 'superadmin@erp.com',
      password,
      companyId: SUPERADMIN_COMPANY_ID,
      isActive: true,
      forcePasswordChange: true,
    },
  });

  // 3. Link user to superadmin role
  await prisma.userRole.upsert({
    where: {
      userId_roleId_companyId: {
        userId: user.id,
        roleId: role.id,
        companyId: SUPERADMIN_COMPANY_ID,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: role.id,
      companyId: SUPERADMIN_COMPANY_ID,
    },
  });

  console.log('✅ Superadmin user and role seeded (bypasses all permission checks)');
  console.log(`📧 Email: superadmin@erp.com`);
  console.log(`🔑 Password: Superadmin123!`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
