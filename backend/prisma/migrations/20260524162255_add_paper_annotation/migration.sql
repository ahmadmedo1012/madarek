-- CreateTable
CREATE TABLE "PaperAnnotation" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaperAnnotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaperAnnotation_paperId_idx" ON "PaperAnnotation"("paperId");

-- CreateIndex
CREATE INDEX "PaperAnnotation_authorId_idx" ON "PaperAnnotation"("authorId");

-- AddForeignKey
ALTER TABLE "PaperAnnotation" ADD CONSTRAINT "PaperAnnotation_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "ResearchPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperAnnotation" ADD CONSTRAINT "PaperAnnotation_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
