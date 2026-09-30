ALTER TABLE `Save`
  ADD COLUMN `iniciadoEm` DATETIME(3) NULL,
  ADD COLUMN `inicialEspecieId` INTEGER NULL;

ALTER TABLE `PokemonCapturado`
  ADD COLUMN `atributos` JSON NULL,
  ADD COLUMN `golpes` JSON NULL;
