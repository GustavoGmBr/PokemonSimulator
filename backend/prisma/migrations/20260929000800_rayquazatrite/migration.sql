-- Preserva as pedras de quem já comprou o Meteorito para Mega Rayquaza.
UPDATE `ItemInventario` AS currentItem
INNER JOIN `ItemInventario` AS legacyItem
  ON currentItem.`saveId` = legacyItem.`saveId`
  AND currentItem.`itemId` = 'rayquazatrite'
  AND legacyItem.`itemId` = 'meteorite'
SET currentItem.`quantidade` = currentItem.`quantidade` + legacyItem.`quantidade`;

DELETE legacyItem FROM `ItemInventario` AS legacyItem
INNER JOIN `ItemInventario` AS currentItem
  ON currentItem.`saveId` = legacyItem.`saveId`
  AND currentItem.`itemId` = 'rayquazatrite'
WHERE legacyItem.`itemId` = 'meteorite';

UPDATE `ItemInventario` SET `itemId` = 'rayquazatrite' WHERE `itemId` = 'meteorite';
DELETE FROM `ItemInventario` WHERE `quantidade` = 0;
