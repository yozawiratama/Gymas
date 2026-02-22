/*
  Warnings:

  - A unique constraint covering the columns `[deviceId,eventId]` on the table `ProcessedEvent` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `OutboxEvent` ADD COLUMN `lastAttemptAt` DATETIME(3) NULL,
    MODIFY `lastError` VARCHAR(500) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `ProcessedEvent_deviceId_eventId_key` ON `ProcessedEvent`(`deviceId`, `eventId`);
