-- CreateEnum
CREATE TYPE "public"."Module" AS ENUM ('HRM', 'ATTENDANCE', 'PAYROLL', 'REPORTS');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "isCompanyAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CompanyModule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "module" "public"."Module" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB,

    CONSTRAINT "CompanyModule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_subdomain_key" ON "public"."Company"("subdomain");

-- CreateIndex
CREATE INDEX "Company_subdomain_idx" ON "public"."Company"("subdomain");

-- CreateIndex
CREATE INDEX "CompanyModule_companyId_idx" ON "public"."CompanyModule"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyModule_companyId_module_key" ON "public"."CompanyModule"("companyId", "module");

-- AddForeignKey
ALTER TABLE "public"."CompanyModule" ADD CONSTRAINT "CompanyModule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Role" ADD CONSTRAINT "Role_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
