-- AlterTable
ALTER TABLE `Attendance` ADD COLUMN `membershipId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `deletedByUserId` VARCHAR(191) NULL,
    ADD COLUMN `voidReason` TEXT NULL;

-- CreateIndex
CREATE INDEX `Attendance_membershipId_idx` ON `Attendance`(`membershipId`);

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `MemberMembership`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_deletedByUserId_fkey` FOREIGN KEY (`deletedByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
