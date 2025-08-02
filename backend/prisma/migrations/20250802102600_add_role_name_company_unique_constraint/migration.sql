/*
  Warnings:

  - A unique constraint covering the columns `[name,companyId]` on the table `Role` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."role_name_company_unique";

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_companyId_key" ON "public"."Role"("name", "companyId");
