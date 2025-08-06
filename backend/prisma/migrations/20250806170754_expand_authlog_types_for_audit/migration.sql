-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."AuthLogType" ADD VALUE 'PROFILE_UPDATE';
ALTER TYPE "public"."AuthLogType" ADD VALUE 'PASSWORD_CHANGE';
ALTER TYPE "public"."AuthLogType" ADD VALUE 'COMPANY_CREATE';
ALTER TYPE "public"."AuthLogType" ADD VALUE 'COMPANY_UPDATE';
ALTER TYPE "public"."AuthLogType" ADD VALUE 'COMPANY_DELETE';
ALTER TYPE "public"."AuthLogType" ADD VALUE 'COMPANY_MODULE_UPDATE';
