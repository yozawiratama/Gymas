/*
  Warnings:

  - Added the required column `createdByUserId` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `createdByUserId` VARCHAR(191) NOT NULL,
    ADD COLUMN `note` VARCHAR(191) NULL,
    ADD COLUMN `status` ENUM('PAID', 'VOID', 'REFUNDED') NOT NULL DEFAULT 'PAID';

-- CreateIndex
CREATE INDEX `Payment_createdAt_idx` ON `Payment`(`createdAt`);

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
