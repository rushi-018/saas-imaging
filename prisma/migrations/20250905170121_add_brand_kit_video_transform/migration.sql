/*
  Warnings:

  - You are about to drop the column `imageProcessed` on the `Usage` table. All the data in the column will be lost.
  - You are about to drop the column `videoProcessed` on the `Usage` table. All the data in the column will be lost.
  - You are about to drop the column `format` on the `VideoTransform` table. All the data in the column will be lost.
  - You are about to drop the column `height` on the `VideoTransform` table. All the data in the column will be lost.
  - You are about to drop the column `platform` on the `VideoTransform` table. All the data in the column will be lost.
  - You are about to drop the column `publicId` on the `VideoTransform` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `VideoTransform` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `VideoTransform` table. All the data in the column will be lost.
  - You are about to drop the column `width` on the `VideoTransform` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[organizationId,type,year,month]` on the table `Usage` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `type` to the `Usage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `VideoTransform` table without a default value. This is not possible if the table is not empty.
  - Added the required column `outputPublicId` to the `VideoTransform` table without a default value. This is not possible if the table is not empty.
  - Added the required column `outputUrl` to the `VideoTransform` table without a default value. This is not possible if the table is not empty.
  - Added the required column `settings` to the `VideoTransform` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `VideoTransform` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transformType` to the `VideoTransform` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `VideoTransform` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Usage_organizationId_month_year_key";

-- AlterTable
ALTER TABLE "public"."Usage" DROP COLUMN "imageProcessed",
DROP COLUMN "videoProcessed",
ADD COLUMN     "count" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."VideoTransform" DROP COLUMN "format",
DROP COLUMN "height",
DROP COLUMN "platform",
DROP COLUMN "publicId",
DROP COLUMN "size",
DROP COLUMN "url",
DROP COLUMN "width",
ADD COLUMN     "brandKitId" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "outputPublicId" TEXT NOT NULL,
ADD COLUMN     "outputUrl" TEXT NOT NULL,
ADD COLUMN     "settings" JSONB NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "transformType" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Usage_organizationId_type_year_month_key" ON "public"."Usage"("organizationId", "type", "year", "month");

-- AddForeignKey
ALTER TABLE "public"."VideoTransform" ADD CONSTRAINT "VideoTransform_brandKitId_fkey" FOREIGN KEY ("brandKitId") REFERENCES "public"."BrandKit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Usage" ADD CONSTRAINT "Usage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
