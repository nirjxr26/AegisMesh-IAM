/*
  Warnings:

  - The `result` column on the `AuditLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "AuditCategory" AS ENUM ('AUTHENTICATION', 'AUTHORIZATION', 'USER_MANAGEMENT', 'ROLE_MANAGEMENT', 'POLICY_MANAGEMENT', 'GROUP_MANAGEMENT', 'SESSION_MANAGEMENT', 'MFA', 'SECURITY', 'SYSTEM', 'DATA_ACCESS');

-- CreateEnum
CREATE TYPE "AuditResult" AS ENUM ('SUCCESS', 'FAILURE', 'ERROR', 'BLOCKED');

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "category" "AuditCategory" NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "resourceId" TEXT,
ADD COLUMN     "sessionId" TEXT,
DROP COLUMN "result",
ADD COLUMN     "result" "AuditResult" NOT NULL DEFAULT 'SUCCESS';

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_category_idx" ON "AuditLog"("category");

-- CreateIndex
CREATE INDEX "AuditLog_result_idx" ON "AuditLog"("result");

-- CreateIndex
CREATE INDEX "AuditLog_ipAddress_idx" ON "AuditLog"("ipAddress");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
