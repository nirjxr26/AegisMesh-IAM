-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "backupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "department" TEXT,
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "mfaType" TEXT,
ADD COLUMN     "notificationPreferences" JSONB,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC',
ADD COLUMN     "trustedDevices" JSONB;

-- CreateTable
CREATE TABLE "OrganizationSettings" (
    "id" TEXT NOT NULL,
    "orgName" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "region" TEXT NOT NULL,
    "minPasswordLength" INTEGER NOT NULL DEFAULT 8,
    "requireUppercase" BOOLEAN NOT NULL DEFAULT true,
    "requireNumber" BOOLEAN NOT NULL DEFAULT true,
    "requireSymbol" BOOLEAN NOT NULL DEFAULT true,
    "passwordExpiryDays" INTEGER,
    "maxFailedAttempts" INTEGER NOT NULL DEFAULT 5,
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 480,
    "requireMfaForAll" BOOLEAN NOT NULL DEFAULT false,
    "allowOAuthLogin" BOOLEAN NOT NULL DEFAULT true,
    "ipAllowlist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "scopes" TEXT[],
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSettings_accountId_key" ON "OrganizationSettings"("accountId");

-- CreateIndex
CREATE INDEX "ApiToken_userId_isActive_idx" ON "ApiToken"("userId", "isActive");

-- CreateIndex
CREATE INDEX "ApiToken_tokenPrefix_idx" ON "ApiToken"("tokenPrefix");

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
