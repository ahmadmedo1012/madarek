-- r323 B3.1 — invite codes (scoped, single-use/expiring self-registration)
CREATE TABLE "InviteCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "offeringId" TEXT,
    "departmentId" TEXT,
    "facultyId" TEXT,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InviteUse" (
    "id" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteUse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InviteCode_code_key" ON "InviteCode"("code");
CREATE INDEX "InviteCode_createdById_idx" ON "InviteCode"("createdById");
CREATE UNIQUE INDEX "InviteUse_codeId_userId_key" ON "InviteUse"("codeId", "userId");

ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "InviteUse" ADD CONSTRAINT "InviteUse_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "InviteCode"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "InviteUse" ADD CONSTRAINT "InviteUse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
