CREATE TABLE `BatalhaEvento` (
    `id` VARCHAR(30) NOT NULL,
    `saveId` VARCHAR(30) NOT NULL,
    `tipo` VARCHAR(30) NOT NULL,
    `especieId` INTEGER NULL,
    `regiao` VARCHAR(30) NULL,
    `dificuldade` VARCHAR(30) NULL,
    `torneioId` VARCHAR(30) NULL,
    `resultado` VARCHAR(30) NULL,
    `descricao` VARCHAR(180) NOT NULL,
    `shiny` BOOLEAN NOT NULL DEFAULT false,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    INDEX `BatalhaEvento_saveId_criadoEm_idx`(`saveId`, `criadoEm`),
    INDEX `BatalhaEvento_saveId_tipo_regiao_criadoEm_idx`(`saveId`, `tipo`, `regiao`, `criadoEm`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `MissaoResgatada` (
    `id` VARCHAR(30) NOT NULL,
    `saveId` VARCHAR(30) NOT NULL,
    `periodo` INTEGER NOT NULL,
    `indice` INTEGER NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    UNIQUE INDEX `MissaoResgatada_saveId_periodo_indice_key`(`saveId`, `periodo`, `indice`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `BatalhaEvento` ADD CONSTRAINT `BatalhaEvento_saveId_fkey` FOREIGN KEY (`saveId`) REFERENCES `Save`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `MissaoResgatada` ADD CONSTRAINT `MissaoResgatada_saveId_fkey` FOREIGN KEY (`saveId`) REFERENCES `Save`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
