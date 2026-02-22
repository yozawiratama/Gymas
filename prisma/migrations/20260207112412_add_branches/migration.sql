/*
  Warnings:

  - The primary key for the `AppSetting` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `branchId` to the `AppSetting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `branchId` to the `Attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `branchId` to the `Media` table without a default value. This is not possible if the table is not empty.
  - Added the required column `branchId` to the `Member` table without a default value. This is not possible if the table is not empty.
  - Added the required column `branchId` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE `Branch` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Branch_code_key`(`code`),
    INDEX `Branch_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed default branch for backfill
SET @defaultBranchId = UUID();
INSERT INTO `Branch` (`id`, `name`, `code`, `address`, `isActive`, `createdAt`)
VALUES (@defaultBranchId, 'Main Branch', 'MAIN', NULL, true, CURRENT_TIMESTAMP(3));

-- AlterTable
ALTER TABLE `AppSetting` DROP PRIMARY KEY,
    ADD COLUMN `branchId` VARCHAR(191) NULL;

UPDATE `AppSetting` SET `branchId` = @defaultBranchId WHERE `branchId` IS NULL;

ALTER TABLE `AppSetting`
    MODIFY `branchId` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`branchId`, `key`);

-- AlterTable
ALTER TABLE `Attendance` ADD COLUMN `branchId` VARCHAR(191) NULL;

UPDATE `Attendance` SET `branchId` = @defaultBranchId WHERE `branchId` IS NULL;

ALTER TABLE `Attendance` MODIFY `branchId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Media` ADD COLUMN `branchId` VARCHAR(191) NULL;

UPDATE `Media` SET `branchId` = @defaultBranchId WHERE `branchId` IS NULL;

ALTER TABLE `Media` MODIFY `branchId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Member` ADD COLUMN `branchId` VARCHAR(191) NULL,
    ADD COLUMN `isFrozen` BOOLEAN NOT NULL DEFAULT false;

UPDATE `Member` SET `branchId` = @defaultBranchId WHERE `branchId` IS NULL;

ALTER TABLE `Member` MODIFY `branchId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `branchId` VARCHAR(191) NULL;

UPDATE `Payment` SET `branchId` = @defaultBranchId WHERE `branchId` IS NULL;

ALTER TABLE `Payment` MODIFY `branchId` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `MembershipPlan` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `durationDays` INTEGER NOT NULL,
    `priceCents` INTEGER NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MembershipPlan_branchId_isActive_idx`(`branchId`, `isActive`),
    INDEX `MembershipPlan_branchId_idx`(`branchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MemberMembership` (
    `id` VARCHAR(191) NOT NULL,
    `memberId` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdByUserId` VARCHAR(191) NOT NULL,

    INDEX `MemberMembership_memberId_endAt_idx`(`memberId`, `endAt`),
    INDEX `MemberMembership_planId_idx`(`planId`),
    INDEX `MemberMembership_branchId_endAt_idx`(`branchId`, `endAt`),
    INDEX `MemberMembership_branchId_idx`(`branchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Attendance_branchId_checkInAt_idx` ON `Attendance`(`branchId`, `checkInAt`);

-- CreateIndex
CREATE INDEX `Attendance_branchId_idx` ON `Attendance`(`branchId`);

-- CreateIndex
CREATE INDEX `Attendance_checkInAt_idx` ON `Attendance`(`checkInAt`);

-- CreateIndex
CREATE INDEX `Media_branchId_idx` ON `Media`(`branchId`);

-- CreateIndex
CREATE INDEX `Member_branchId_idx` ON `Member`(`branchId`);

-- CreateIndex
CREATE INDEX `Member_branchId_createdAt_idx` ON `Member`(`branchId`, `createdAt`);

-- CreateIndex
CREATE INDEX `Payment_branchId_paidAt_idx` ON `Payment`(`branchId`, `paidAt`);

-- CreateIndex
CREATE INDEX `Payment_branchId_createdAt_idx` ON `Payment`(`branchId`, `createdAt`);

-- CreateIndex
CREATE INDEX `Payment_branchId_idx` ON `Payment`(`branchId`);

-- CreateIndex
CREATE INDEX `Payment_paidAt_idx` ON `Payment`(`paidAt`);

-- AddForeignKey
ALTER TABLE `Member` ADD CONSTRAINT `Member_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MembershipPlan` ADD CONSTRAINT `MembershipPlan_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MemberMembership` ADD CONSTRAINT `MemberMembership_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `Member`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MemberMembership` ADD CONSTRAINT `MemberMembership_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `MembershipPlan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MemberMembership` ADD CONSTRAINT `MemberMembership_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MemberMembership` ADD CONSTRAINT `MemberMembership_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Media` ADD CONSTRAINT `Media_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AppSetting` ADD CONSTRAINT `AppSetting_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
