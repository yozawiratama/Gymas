-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `membershipId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Payment_membershipId_idx` ON `Payment`(`membershipId`);

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_membershipId_fkey` FOREIGN KEY (`membershipId`) REFERENCES `MemberMembership`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
