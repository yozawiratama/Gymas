-- AlterTable
ALTER TABLE `User` MODIFY `role` ENUM('SUPER_ADMIN', 'OWNER', 'ADMIN', 'STAFF', 'FRONTDESK') NOT NULL DEFAULT 'STAFF';

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `actorUserId` VARCHAR(191) NULL,
    `entityType` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `metaJson` JSON NULL,
    `ip` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_actorUserId_idx`(`actorUserId`),
    INDEX `AuditLog_action_idx`(`action`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    INDEX `AuditLog_entityType_entityId_idx`(`entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
