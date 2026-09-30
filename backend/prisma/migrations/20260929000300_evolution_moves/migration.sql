ALTER TABLE `EspecieAtaque` ADD COLUMN `nivelAprendido` INTEGER NOT NULL DEFAULT 1;
ALTER TABLE `PokemonCapturado` ADD COLUMN `megaForma` VARCHAR(60) NULL;

CREATE TABLE `EspecieRegistrada` (
  `saveId` VARCHAR(30) NOT NULL,
  `especieId` INTEGER NOT NULL,
  PRIMARY KEY (`saveId`, `especieId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `EspecieRegistrada` ADD CONSTRAINT `EspecieRegistrada_saveId_fkey` FOREIGN KEY (`saveId`) REFERENCES `Save`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
