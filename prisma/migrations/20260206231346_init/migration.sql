-- AlterTable
ALTER TABLE `LoginHistory` ADD COLUMN `usernameAttempt` VARCHAR(191) NULL,
    MODIFY `userId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `LoginHistory_usernameAttempt_occurredAt_idx` ON `LoginHistory`(`usernameAttempt`, `occurredAt`);
