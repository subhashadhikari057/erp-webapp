import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Module } from '@prisma/client';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ManageCompanyModulesDto } from './dto/manage-company-modules.dto';
import { CompanyResponseDto, CompanyListResponseDto } from './dto/company-response.dto';
import bcrypt from 'bcryptjs';

@Injectable()
export class SuperadminService {
  constructor(private prisma: PrismaService) {}

  async createCompany(createCompanyDto: CreateCompanyDto): Promise<CompanyResponseDto> {
    const { name, subdomain, adminEmail, adminName, adminPhone, adminPassword } = createCompanyDto;

    // Check if subdomain already exists
    const existingCompany = await this.prisma.company.findUnique({
      where: { subdomain }
    });

    if (existingCompany) {
      throw new ConflictException(`Subdomain '${subdomain}' is already taken`);
    }

    // Check if admin email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingUser) {
      throw new ConflictException(`Email '${adminEmail}' is already registered`);
    }

    // Generate password if not provided
    const password = adminPassword || this.generateRandomPassword();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create company and admin user in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create company
      const company = await tx.company.create({
        data: {
          name,
          subdomain,
          isActive: true,
        },
      });

      // 2. Create "Company Admin" role for this company
      const adminRole = await tx.role.create({
        data: {
          name: 'Company Admin',
          description: 'Full administrative access to company',
          companyId: company.id,
        },
      });

      // 3. Create admin user
      const adminUser = await tx.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: adminName,
          phone: adminPhone,
          companyId: company.id,
          isCompanyAdmin: true,
          isActive: true,
          forcePasswordChange: !adminPassword, // Force change if auto-generated
        },
      });

      // 4. Link admin user to admin role
      await tx.userRole.create({
        data: {
          userId: adminUser.id,
          roleId: adminRole.id,
          companyId: company.id,
        },
      });

      // 5. Create default modules (all disabled initially)
      const modules = ['HRM', 'ATTENDANCE', 'PAYROLL', 'REPORTS'];
      await Promise.all(
        modules.map((module) =>
          tx.companyModule.create({
            data: {
              companyId: company.id,
              module: module as Module,
              enabled: false,
            },
          })
        )
      );

      return { company, adminUser, generatedPassword: adminPassword ? null : password };
    });

    // Return company info with admin details and password if generated
    const response = {
      ...this.mapToCompanyResponse(result.company),
      adminUser: {
        id: result.adminUser.id,
        email: result.adminUser.email,
        name: result.adminUser.name || 'Unknown',
        phone: result.adminUser.phone || undefined,
        lastLoginAt: result.adminUser.lastLoginAt,
      }
    };

    // Include password in response if auto-generated
    if (result.generatedPassword) {
      response.generatedPassword = result.generatedPassword;
      response.passwordNote = `⚠️ Auto-generated password. Admin must change on first login.`;
      console.log(`🔑 Generated password for ${adminEmail}: ${result.generatedPassword}`);
    }

    return response;
  }

  async getAllCompanies(page = 1, limit = 10, search?: string): Promise<CompanyListResponseDto> {
    const skip = (page - 1) * limit;
    
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { subdomain: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {};

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { users: true }
          },
                  users: {
          where: { isCompanyAdmin: true },
          select: { id: true, email: true, name: true, phone: true, lastLoginAt: true },
          take: 1
        },
          modules: {
            where: { enabled: true },
            select: { module: true }
          }
        },
      }),
      this.prisma.company.count({ where }),
    ]);

    const mappedCompanies = companies.map((company) => ({
      ...this.mapToCompanyResponse(company),
      userCount: company._count.users,
      enabledModules: company.modules.map(m => m.module),
      adminUser: company.users[0] ? {
        id: company.users[0].id,
        email: company.users[0].email,
        name: company.users[0].name || 'Unknown',
        phone: company.users[0].phone || undefined,
        lastLoginAt: company.users[0].lastLoginAt,
      } : undefined,
    }));

    return {
      companies: mappedCompanies,
      total,
      page,
      limit,
    };
  }

  async getCompanyById(companyId: string): Promise<CompanyResponseDto> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: { 
            users: true,
            roles: true,
          }
        },
        users: {
          where: { isCompanyAdmin: true },
          select: { id: true, email: true, name: true, phone: true, lastLoginAt: true, isActive: true },
          take: 1
        },
        modules: {
          select: { module: true, enabled: true, settings: true }
        }
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    const activeUsers = await this.prisma.user.count({
      where: { companyId, isActive: true }
    });

    return {
      ...this.mapToCompanyResponse(company),
      userCount: company._count.users,
      activeUsers,
      enabledModules: company.modules.filter(m => m.enabled).map(m => m.module),
      adminUser: company.users[0] ? {
        id: company.users[0].id,
        email: company.users[0].email,
        name: company.users[0].name || 'Unknown',
        phone: company.users[0].phone || undefined,
        lastLoginAt: company.users[0].lastLoginAt,
      } : undefined,
    };
  }

  async updateCompany(companyId: string, updateCompanyDto: UpdateCompanyDto): Promise<CompanyResponseDto> {
    const existingCompany = await this.prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!existingCompany) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    const updatedCompany = await this.prisma.company.update({
      where: { id: companyId },
      data: updateCompanyDto,
    });

    return this.mapToCompanyResponse(updatedCompany);
  }

  async manageCompanyModules(companyId: string, modulesDto: ManageCompanyModulesDto): Promise<{ message: string }> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    // Update each module setting
    const updates: Promise<any>[] = [];
    for (const [module, config] of Object.entries(modulesDto)) {
      if (config) {
        updates.push(
          this.prisma.companyModule.upsert({
            where: {
              companyId_module: {
                companyId,
                module: module as Module,
              },
            },
            update: {
              enabled: config.enabled,
              settings: config.settings || {},
            },
            create: {
              companyId,
              module: module as Module,
              enabled: config.enabled,
              settings: config.settings || {},
            },
          })
        );
      }
    }

    await Promise.all(updates);

    return { message: 'Company modules updated successfully' };
  }

  async deleteCompany(companyId: string): Promise<{ message: string }> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${companyId} not found`);
    }

    if (companyId === 'global') {
      throw new ConflictException('Cannot delete the global system company');
    }

    // Delete all related data in correct order using transaction
    await this.prisma.$transaction(async (tx) => {
      // 1. Delete sessions first
      await tx.session.deleteMany({
        where: { companyId }
      });

      // 2. Delete auth logs
      await tx.authLog.deleteMany({
        where: { companyId }
      });

      // 3. Delete role permissions
      await tx.rolePermission.deleteMany({
        where: { companyId }
      });

      // 4. Delete user roles
      await tx.userRole.deleteMany({
        where: { companyId }
      });

      // 5. Delete users
      await tx.user.deleteMany({
        where: { companyId }
      });

      // 6. Delete roles
      await tx.role.deleteMany({
        where: { companyId }
      });

      // 7. Delete company modules
      await tx.companyModule.deleteMany({
        where: { companyId }
      });

      // 8. Finally delete the company
      await tx.company.delete({
        where: { id: companyId }
      });
    });

    return { message: `Company '${company.name}' and all related data deleted successfully` };
  }

  private mapToCompanyResponse(company: any): CompanyResponseDto {
    return {
      id: company.id,
      name: company.name,
      subdomain: company.subdomain,
      isActive: company.isActive,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }

  private generateRandomPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}