-- CreateTable
CREATE TABLE "PlatformSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL DEFAULT 'platform',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiTelemetry" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "feature" TEXT NOT NULL,
    "model" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiTelemetry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalAlert" (
    "id" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformSetting_key_key" ON "PlatformSetting"("key");

-- CreateIndex
CREATE INDEX "PlatformSetting_category_idx" ON "PlatformSetting"("category");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_slug_key" ON "FeatureFlag"("slug");

-- CreateIndex
CREATE INDEX "FeatureFlag_category_idx" ON "FeatureFlag"("category");

-- CreateIndex
CREATE INDEX "FeatureFlag_enabled_idx" ON "FeatureFlag"("enabled");

-- CreateIndex
CREATE INDEX "AiTelemetry_userId_idx" ON "AiTelemetry"("userId");

-- CreateIndex
CREATE INDEX "AiTelemetry_feature_idx" ON "AiTelemetry"("feature");

-- CreateIndex
CREATE INDEX "AiTelemetry_createdAt_idx" ON "AiTelemetry"("createdAt");

-- CreateIndex
CREATE INDEX "AiTelemetry_success_idx" ON "AiTelemetry"("success");

-- CreateIndex
CREATE INDEX "OperationalAlert_severity_idx" ON "OperationalAlert"("severity");

-- CreateIndex
CREATE INDEX "OperationalAlert_category_idx" ON "OperationalAlert"("category");

-- CreateIndex
CREATE INDEX "OperationalAlert_resolvedAt_idx" ON "OperationalAlert"("resolvedAt");

-- CreateIndex
CREATE INDEX "OperationalAlert_createdAt_idx" ON "OperationalAlert"("createdAt");

-- CreateIndex
CREATE INDEX "LoginEvent_userId_idx" ON "LoginEvent"("userId");

-- CreateIndex
CREATE INDEX "LoginEvent_success_idx" ON "LoginEvent"("success");

-- CreateIndex
CREATE INDEX "LoginEvent_createdAt_idx" ON "LoginEvent"("createdAt");

-- CreateIndex
CREATE INDEX "LoginEvent_email_idx" ON "LoginEvent"("email");
