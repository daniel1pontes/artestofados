/*
  Warnings:

  - You are about to drop the column `date` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `googleEventId` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `time` on the `appointments` table. All the data in the column will be lost.
  - Added the required column `end` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start` to the `appointments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "date",
DROP COLUMN "googleEventId",
DROP COLUMN "time",
ADD COLUMN     "end" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "gcalEventId" TEXT,
ADD COLUMN     "start" TIMESTAMP(3) NOT NULL;
