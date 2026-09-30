-- CreateTable
CREATE TABLE `Usuario` (
    `id` VARCHAR(30) NOT NULL,
    `login` VARCHAR(30) NOT NULL,
    `senhaHash` VARCHAR(255) NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Usuario_login_key`(`login`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Save` (
    `id` VARCHAR(30) NOT NULL,
    `usuarioId` VARCHAR(30) NOT NULL,
    `nomeTreinador` VARCHAR(30) NOT NULL,
    `moedas` INTEGER NOT NULL DEFAULT 0,
    `vitorias` INTEGER NOT NULL DEFAULT 0,
    `derrotas` INTEGER NOT NULL DEFAULT 0,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Save_usuarioId_key`(`usuarioId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PokemonCapturado` (
    `id` VARCHAR(30) NOT NULL,
    `saveId` VARCHAR(30) NOT NULL,
    `especieId` INTEGER NOT NULL,
    `apelido` VARCHAR(30) NULL,
    `nivel` INTEGER NOT NULL DEFAULT 5,
    `experiencia` INTEGER NOT NULL DEFAULT 0,
    `hpAtual` INTEGER NOT NULL,
    `posicaoTime` INTEGER NULL,
    `capturadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PokemonCapturado_saveId_especieId_idx`(`saveId`, `especieId`),
    UNIQUE INDEX `PokemonCapturado_saveId_posicaoTime_key`(`saveId`, `posicaoTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ItemInventario` (
    `id` VARCHAR(30) NOT NULL,
    `saveId` VARCHAR(30) NOT NULL,
    `itemId` VARCHAR(60) NOT NULL,
    `quantidade` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `ItemInventario_saveId_itemId_key`(`saveId`, `itemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Save` ADD CONSTRAINT `Save_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PokemonCapturado` ADD CONSTRAINT `PokemonCapturado_saveId_fkey` FOREIGN KEY (`saveId`) REFERENCES `Save`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ItemInventario` ADD CONSTRAINT `ItemInventario_saveId_fkey` FOREIGN KEY (`saveId`) REFERENCES `Save`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
