-- CreateTable
CREATE TABLE `PersonalTrainer` (
    `id` VARCHAR(191) NOT NULL,
    `branchId` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `bio` TEXT NULL,
    `specialty` VARCHAR(191) NULL,
    `photoMediaId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `createdByUserId` VARCHAR(191) NULL,

    INDEX `PersonalTrainer_branchId_idx`(`branchId`),
    INDEX `PersonalTrainer_branchId_isActive_idx`(`branchId`, `isActive`),
    INDEX `PersonalTrainer_fullName_idx`(`fullName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PersonalTrainer` ADD CONSTRAINT `PersonalTrainer_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `Branch`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PersonalTrainer` ADD CONSTRAINT `PersonalTrainer_photoMediaId_fkey` FOREIGN KEY (`photoMediaId`) REFERENCES `Media`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PersonalTrainer` ADD CONSTRAINT `PersonalTrainer_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
