ALTER TABLE `Save` ADD COLUMN `kitEntregue` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `PokemonCapturado` ADD COLUMN `shiny` BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE `GolpeBatalha` (
  `id` INTEGER NOT NULL,
  `nome` VARCHAR(80) NOT NULL,
  `tipo` VARCHAR(30) NOT NULL,
  `categoria` VARCHAR(20) NOT NULL,
  `poder` INTEGER NOT NULL,
  `precisao` INTEGER NULL,
  `prioridade` INTEGER NOT NULL DEFAULT 0,
  UNIQUE INDEX `GolpeBatalha_nome_key`(`nome`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `EspecieAtaque` (
  `especieId` INTEGER NOT NULL,
  `posicao` INTEGER NOT NULL,
  `golpeId` INTEGER NOT NULL,
  UNIQUE INDEX `EspecieAtaque_especieId_golpeId_key`(`especieId`, `golpeId`),
  PRIMARY KEY (`especieId`, `posicao`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Batalha` (
  `id` VARCHAR(30) NOT NULL,
  `saveId` VARCHAR(30) NOT NULL,
  `versao` INTEGER NOT NULL DEFAULT 0,
  `estado` JSON NOT NULL,
  `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizadoEm` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Batalha_saveId_key`(`saveId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `DesafioConcluido` (
  `saveId` VARCHAR(30) NOT NULL,
  `desafioId` VARCHAR(40) NOT NULL,
  `vencidoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`saveId`, `desafioId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `EspecieAtaque` ADD CONSTRAINT `EspecieAtaque_golpeId_fkey` FOREIGN KEY (`golpeId`) REFERENCES `GolpeBatalha`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `Batalha` ADD CONSTRAINT `Batalha_saveId_fkey` FOREIGN KEY (`saveId`) REFERENCES `Save`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `DesafioConcluido` ADD CONSTRAINT `DesafioConcluido_saveId_fkey` FOREIGN KEY (`saveId`) REFERENCES `Save`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
