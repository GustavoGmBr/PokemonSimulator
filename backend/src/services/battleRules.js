import { randomInt } from 'node:crypto';
import { getCatalogo, getEspecie } from './catalogo.js';

export const GYMS = [
  { id: 'brock', nome: 'Brock', tipo: 'rock', nivel: 15, pokemon: [74, 95] },
  { id: 'misty', nome: 'Misty', tipo: 'water', nivel: 22, pokemon: [120, 121] },
  { id: 'lt-surge', nome: 'Lt. Surge', tipo: 'electric', nivel: 28, pokemon: [100, 25, 26] },
  { id: 'erika', nome: 'Erika', tipo: 'grass', nivel: 30, pokemon: [114, 70, 45] },
  { id: 'koga', nome: 'Koga', tipo: 'poison', nivel: 44, pokemon: [109, 89, 49, 110] },
  { id: 'sabrina', nome: 'Sabrina', tipo: 'psychic', nivel: 50, pokemon: [64, 122, 49, 65] },
  { id: 'blaine', nome: 'Blaine', tipo: 'fire', nivel: 55, pokemon: [58, 77, 78, 59] },
  { id: 'giovanni', nome: 'Giovanni', tipo: 'ground', nivel: 60, pokemon: [53, 51, 34, 31, 112] },
];
export const ELITE = [
  { id: 'lorelei', nome: 'Lorelei', tipo: 'ice', nivel: 65, pokemon: [87, 91, 80, 124, 131] },
  { id: 'bruno', nome: 'Bruno', tipo: 'fighting', nivel: 70, pokemon: [95, 107, 106, 95, 68] },
  { id: 'agatha', nome: 'Agatha', tipo: 'ghost', nivel: 80, pokemon: [94, 42, 93, 24, 94] },
  { id: 'lance', nome: 'Lance', tipo: 'dragon', nivel: 90, pokemon: [130, 148, 148, 142, 149] },
];
export const CHAMPION = { id: 'blue', nome: 'Blue', tipo: 'champion', nivel: 100, pokemon: [18, 65, 112, 59, 103, 9] };
export const JOHTO_GYMS = [
  { id: 'johto-falkner', nome: 'Falkner', tipo: 'flying', nivel: 15, pokemon: [16, 17] },
  { id: 'johto-bugsy', nome: 'Bugsy', tipo: 'bug', nivel: 22, pokemon: [11, 14, 123] },
  { id: 'johto-whitney', nome: 'Whitney', tipo: 'normal', nivel: 28, pokemon: [35, 241] },
  { id: 'johto-morty', nome: 'Morty', tipo: 'ghost', nivel: 35, pokemon: [92, 93, 94, 93] },
  { id: 'johto-chuck', nome: 'Chuck', tipo: 'fighting', nivel: 44, pokemon: [57, 62] },
  { id: 'johto-jasmine', nome: 'Jasmine', tipo: 'steel', nivel: 50, pokemon: [81, 81, 208] },
  { id: 'johto-pryce', nome: 'Pryce', tipo: 'ice', nivel: 55, pokemon: [86, 87, 221] },
  { id: 'johto-clair', nome: 'Clair', tipo: 'dragon', nivel: 60, pokemon: [148, 148, 130, 230] },
];
export const JOHTO_ELITE = [
  { id: 'johto-will', nome: 'Will', tipo: 'psychic', nivel: 65, pokemon: [178, 124, 103, 80, 178] },
  { id: 'johto-koga', nome: 'Koga', tipo: 'poison', nivel: 70, pokemon: [168, 49, 205, 89, 169] },
  { id: 'johto-bruno', nome: 'Bruno', tipo: 'fighting', nivel: 80, pokemon: [237, 106, 107, 95, 68] },
  { id: 'johto-karen', nome: 'Karen', tipo: 'dark', nivel: 90, pokemon: [197, 45, 94, 198, 229] },
];
export const JOHTO_CHAMPION = { id: 'johto-lance', nome: 'Lance', tipo: 'champion', nivel: 100, pokemon: [130, 149, 149, 142, 6, 149] };
export const HOENN_GYMS = [
  { id: 'hoenn-roxanne', nome: 'Roxanne', tipo: 'rock', nivel: 15, pokemon: [74, 299] },
  { id: 'hoenn-brawly', nome: 'Brawly', tipo: 'fighting', nivel: 22, pokemon: [66, 296] },
  { id: 'hoenn-wattson', nome: 'Wattson', tipo: 'electric', nivel: 28, pokemon: [81, 100, 82] },
  { id: 'hoenn-flannery', nome: 'Flannery', tipo: 'fire', nivel: 35, pokemon: [218, 322, 324] },
  { id: 'hoenn-norman', nome: 'Norman', tipo: 'normal', nivel: 44, pokemon: [289, 288, 289] },
  { id: 'hoenn-winona', nome: 'Winona', tipo: 'flying', nivel: 50, pokemon: [277, 279, 227, 334] },
  { id: 'hoenn-tate-liza', nome: 'Tate e Liza', tipo: 'psychic', nivel: 55, pokemon: [338, 337] },
  { id: 'hoenn-wallace', nome: 'Wallace', tipo: 'water', nivel: 60, pokemon: [370, 364, 119, 340, 350] },
];
export const HOENN_ELITE = [
  { id: 'hoenn-sidney', nome: 'Sidney', tipo: 'dark', nivel: 65, pokemon: [262, 275, 332, 319, 359] },
  { id: 'hoenn-phoebe', nome: 'Phoebe', tipo: 'ghost', nivel: 70, pokemon: [356, 354, 302, 354, 356] },
  { id: 'hoenn-glacia', nome: 'Glacia', tipo: 'ice', nivel: 80, pokemon: [362, 364, 364, 362, 365] },
  { id: 'hoenn-drake', nome: 'Drake', tipo: 'dragon', nivel: 90, pokemon: [372, 334, 330, 330, 373] },
];
export const HOENN_CHAMPION = { id: 'hoenn-steven', nome: 'Steven', tipo: 'champion', nivel: 100, pokemon: [227, 306, 344, 346, 348, 376] };
export const SINNOH_GYMS = [
  { id: 'sinnoh-roark', nome: 'Roark', tipo: 'rock', nivel: 15, pokemon: [74, 95, 408] },
  { id: 'sinnoh-gardenia', nome: 'Gardenia', tipo: 'grass', nivel: 22, pokemon: [387, 421, 407] },
  { id: 'sinnoh-fantina', nome: 'Fantina', tipo: 'ghost', nivel: 28, pokemon: [355, 93, 429] },
  { id: 'sinnoh-maylene', nome: 'Maylene', tipo: 'fighting', nivel: 35, pokemon: [307, 67, 448] },
  { id: 'sinnoh-wake', nome: 'Crasher Wake', tipo: 'water', nivel: 44, pokemon: [130, 195, 419] },
  { id: 'sinnoh-byron', nome: 'Byron', tipo: 'steel', nivel: 50, pokemon: [82, 208, 411] },
  { id: 'sinnoh-candice', nome: 'Candice', tipo: 'ice', nivel: 55, pokemon: [215, 221, 460, 478] },
  { id: 'sinnoh-volkner', nome: 'Volkner', tipo: 'electric', nivel: 60, pokemon: [135, 26, 405, 466] },
];
export const SINNOH_ELITE = [
  { id: 'sinnoh-aaron', nome: 'Aaron', tipo: 'bug', nivel: 65, pokemon: [469, 212, 416, 214, 452] },
  { id: 'sinnoh-bertha', nome: 'Bertha', tipo: 'ground', nivel: 70, pokemon: [340, 472, 76, 464, 450] },
  { id: 'sinnoh-flint', nome: 'Flint', tipo: 'fire', nivel: 80, pokemon: [229, 136, 78, 392, 467] },
  { id: 'sinnoh-lucian', nome: 'Lucian', tipo: 'psychic', nivel: 90, pokemon: [122, 196, 437, 65, 475] },
];
export const SINNOH_CHAMPION = { id: 'sinnoh-cynthia', nome: 'Cynthia', tipo: 'champion', nivel: 100, pokemon: [442, 407, 468, 448, 350, 445] };
export const UNOVA1_GYMS = [
  { id: 'unova1-cilan', nome: 'Cilan', tipo: 'grass', nivel: 15, pokemon: [506, 511] },
  { id: 'unova1-lenora', nome: 'Lenora', tipo: 'normal', nivel: 22, pokemon: [507, 505] },
  { id: 'unova1-burgh', nome: 'Burgh', tipo: 'bug', nivel: 28, pokemon: [544, 557, 542] },
  { id: 'unova1-elesa', nome: 'Elesa', tipo: 'electric', nivel: 35, pokemon: [587, 587, 523] },
  { id: 'unova1-clay', nome: 'Clay', tipo: 'ground', nivel: 44, pokemon: [552, 536, 530] },
  { id: 'unova1-skyla', nome: 'Skyla', tipo: 'flying', nivel: 50, pokemon: [528, 521, 581] },
  { id: 'unova1-brycen', nome: 'Brycen', tipo: 'ice', nivel: 55, pokemon: [583, 615, 614] },
  { id: 'unova1-drayden', nome: 'Drayden', tipo: 'dragon', nivel: 60, pokemon: [611, 621, 612] },
];
export const UNOVA1_ELITE = [
  { id: 'unova1-shauntal', nome: 'Shauntal', tipo: 'ghost', nivel: 65, pokemon: [563, 593, 623, 609] },
  { id: 'unova1-grimsley', nome: 'Grimsley', tipo: 'dark', nivel: 70, pokemon: [560, 510, 553, 625] },
  { id: 'unova1-caitlin', nome: 'Caitlin', tipo: 'psychic', nivel: 80, pokemon: [579, 518, 561, 576] },
  { id: 'unova1-marshal', nome: 'Marshal', tipo: 'fighting', nivel: 90, pokemon: [538, 539, 534, 620] },
];
export const UNOVA1_CHAMPION = { id: 'unova1-alder', nome: 'Alder', tipo: 'champion', nivel: 100, pokemon: [617, 626, 621, 584, 589, 637] };
export const UNOVA2_GYMS = [
  { id: 'unova2-cheren', nome: 'Cheren', tipo: 'normal', nivel: 15, pokemon: [504, 506] },
  { id: 'unova2-roxie', nome: 'Roxie', tipo: 'poison', nivel: 22, pokemon: [109, 544] },
  { id: 'unova2-burgh', nome: 'Burgh', tipo: 'bug', nivel: 28, pokemon: [541, 557, 542] },
  { id: 'unova2-elesa', nome: 'Elesa', tipo: 'electric', nivel: 35, pokemon: [587, 180, 523] },
  { id: 'unova2-clay', nome: 'Clay', tipo: 'ground', nivel: 44, pokemon: [552, 28, 530] },
  { id: 'unova2-skyla', nome: 'Skyla', tipo: 'flying', nivel: 50, pokemon: [528, 227, 581] },
  { id: 'unova2-drayden', nome: 'Drayden', tipo: 'dragon', nivel: 55, pokemon: [621, 330, 612] },
  { id: 'unova2-marlon', nome: 'Marlon', tipo: 'water', nivel: 60, pokemon: [565, 321, 593] },
];
export const UNOVA2_ELITE = [
  { id: 'unova2-shauntal', nome: 'Shauntal', tipo: 'ghost', nivel: 65, pokemon: [563, 426, 623, 609] },
  { id: 'unova2-grimsley', nome: 'Grimsley', tipo: 'dark', nivel: 70, pokemon: [510, 560, 553, 625] },
  { id: 'unova2-caitlin', nome: 'Caitlin', tipo: 'psychic', nivel: 80, pokemon: [518, 561, 579, 576] },
  { id: 'unova2-marshal', nome: 'Marshal', tipo: 'fighting', nivel: 90, pokemon: [538, 539, 620, 534] },
];
export const UNOVA2_CHAMPION = { id: 'unova2-iris', nome: 'Iris', tipo: 'champion', nivel: 100, pokemon: [635, 621, 306, 567, 131, 612] };
export const KALOS_GYMS = [
  { id: 'kalos-viola', nome: 'Viola', tipo: 'bug', nivel: 15, pokemon: [283, 666] },
  { id: 'kalos-grant', nome: 'Grant', tipo: 'rock', nivel: 22, pokemon: [698, 696] },
  { id: 'kalos-korrina', nome: 'Korrina', tipo: 'fighting', nivel: 28, pokemon: [619, 67, 701] },
  { id: 'kalos-ramos', nome: 'Ramos', tipo: 'grass', nivel: 35, pokemon: [189, 70, 673] },
  { id: 'kalos-clemont', nome: 'Clemont', tipo: 'electric', nivel: 44, pokemon: [587, 82, 695] },
  { id: 'kalos-valerie', nome: 'Valerie', tipo: 'fairy', nivel: 50, pokemon: [303, 122, 700] },
  { id: 'kalos-olympia', nome: 'Olympia', tipo: 'psychic', nivel: 55, pokemon: [561, 199, 678] },
  { id: 'kalos-wulfric', nome: 'Wulfric', tipo: 'ice', nivel: 60, pokemon: [460, 615, 713] },
];
export const KALOS_ELITE = [
  { id: 'kalos-malva', nome: 'Malva', tipo: 'fire', nivel: 65, pokemon: [668, 324, 609, 663] },
  { id: 'kalos-siebold', nome: 'Siebold', tipo: 'water', nivel: 70, pokemon: [693, 121, 130, 689] },
  { id: 'kalos-wikstrom', nome: 'Wikstrom', tipo: 'steel', nivel: 80, pokemon: [707, 476, 212, 681] },
  { id: 'kalos-drasna', nome: 'Drasna', tipo: 'dragon', nivel: 90, pokemon: [691, 334, 621, 715] },
];
export const KALOS_CHAMPION = { id: 'kalos-diantha', nome: 'Diantha', tipo: 'champion', nivel: 100, pokemon: [701, 706, 699, 711, 692, 282] };
export const ALOLA_TRIALS = [
  { id: 'alola-ilima', nome: 'Ilima', tipo: 'normal', nivel: 15, pokemon: [734, 735] },
  { id: 'alola-lana', nome: 'Lana', tipo: 'water', nivel: 22, pokemon: [751, 752] },
  { id: 'alola-kiawe', nome: 'Kiawe', tipo: 'fire', nivel: 28, pokemon: [757, 758] },
  { id: 'alola-mallow', nome: 'Mallow', tipo: 'grass', nivel: 35, pokemon: [753, 754] },
  { id: 'alola-sophocles', nome: 'Sophocles', tipo: 'electric', nivel: 44, pokemon: [737, 738] },
  { id: 'alola-acerola-trial', nome: 'Acerola', tipo: 'ghost', nivel: 50, pokemon: [769, 770, 778] },
  { id: 'alola-mina', nome: 'Mina', tipo: 'fairy', nivel: 55, pokemon: [742, 743, 764] },
  { id: 'alola-hapu', nome: 'Hapu', tipo: 'ground', nivel: 60, pokemon: [749, 750, 770] },
];
export const ALOLA_ELITE = [
  { id: 'alola-molayne', nome: 'Molayne', tipo: 'steel', nivel: 65, pokemon: [227, 462, 707, 777, 476] },
  { id: 'alola-olivia', nome: 'Olivia', tipo: 'rock', nivel: 70, pokemon: [348, 476, 713, 703, 745] },
  { id: 'alola-acerola', nome: 'Acerola', tipo: 'ghost', nivel: 80, pokemon: [354, 478, 609, 778, 781] },
  { id: 'alola-kahili', nome: 'Kahili', tipo: 'flying', nivel: 90, pokemon: [628, 741, 715, 227, 733] },
];
export const ALOLA_CHAMPION = { id: 'alola-hau', nome: 'Hau', tipo: 'champion', nivel: 100, pokemon: [26, 136, 715, 128, 745, 724] };
export const GALAR_GYMS = [
  { id: 'galar-milo', nome: 'Milo', tipo: 'grass', nivel: 15, pokemon: [829, 830] },
  { id: 'galar-nessa', nome: 'Nessa', tipo: 'water', nivel: 22, pokemon: [118, 846, 834] },
  { id: 'galar-kabu', nome: 'Kabu', tipo: 'fire', nivel: 28, pokemon: [38, 59, 851] },
  { id: 'galar-bea', nome: 'Bea', tipo: 'fighting', nivel: 35, pokemon: [237, 675, 865, 68] },
  { id: 'galar-opal', nome: 'Opal', tipo: 'fairy', nivel: 44, pokemon: [110, 303, 468, 869] },
  { id: 'galar-gordie', nome: 'Gordie', tipo: 'rock', nivel: 50, pokemon: [689, 213, 874, 839] },
  { id: 'galar-piers', nome: 'Piers', tipo: 'dark', nivel: 55, pokemon: [560, 687, 435, 862] },
  { id: 'galar-raihan', nome: 'Raihan', tipo: 'dragon', nivel: 60, pokemon: [526, 330, 844, 884] },
];
export const GALAR_CUP = [
  { id: 'galar-marnie', nome: 'Marnie', tipo: 'dark', nivel: 65, pokemon: [510, 560, 877, 454, 861] },
  { id: 'galar-hop', nome: 'Hop', tipo: 'normal', nivel: 70, pokemon: [832, 823, 871, 143, 815] },
  { id: 'galar-bede', nome: 'Bede', tipo: 'fairy', nivel: 80, pokemon: [282, 303, 858, 869] },
  { id: 'galar-raihan-cup', nome: 'Raihan', tipo: 'dragon', nivel: 90, pokemon: [330, 844, 776, 884, 526] },
];
export const GALAR_CHAMPION = { id: 'galar-leon', nome: 'Leon', tipo: 'champion', nivel: 100, pokemon: [681, 887, 464, 812, 537, 6] };
export const PALDEA_GYMS = [
  { id: 'paldea-katy', nome: 'Katy', tipo: 'bug', nivel: 15, pokemon: [919, 917, 918] },
  { id: 'paldea-brassius', nome: 'Brassius', tipo: 'grass', nivel: 22, pokemon: [548, 928, 185] },
  { id: 'paldea-iono', nome: 'Iono', tipo: 'electric', nivel: 28, pokemon: [940, 939, 404, 429] },
  { id: 'paldea-kofu', nome: 'Kofu', tipo: 'water', nivel: 35, pokemon: [976, 961, 740] },
  { id: 'paldea-larry', nome: 'Larry', tipo: 'normal', nivel: 44, pokemon: [775, 982, 398] },
  { id: 'paldea-ryme', nome: 'Ryme', tipo: 'ghost', nivel: 50, pokemon: [778, 354, 972, 849] },
  { id: 'paldea-tulip', nome: 'Tulip', tipo: 'psychic', nivel: 55, pokemon: [981, 282, 956, 671] },
  { id: 'paldea-grusha', nome: 'Grusha', tipo: 'ice', nivel: 60, pokemon: [873, 614, 975, 334] },
];
export const PALDEA_ELITE = [
  { id: 'paldea-rika', nome: 'Rika', tipo: 'ground', nivel: 65, pokemon: [340, 323, 232, 51, 980] },
  { id: 'paldea-poppy', nome: 'Poppy', tipo: 'steel', nivel: 70, pokemon: [879, 437, 462, 212, 959] },
  { id: 'paldea-larry-elite', nome: 'Larry', tipo: 'flying', nivel: 80, pokemon: [357, 741, 334, 373, 398] },
  { id: 'paldea-hassel', nome: 'Hassel', tipo: 'dragon', nivel: 90, pokemon: [621, 612, 691, 715, 998] },
];
export const PALDEA_CHAMPION = { id: 'paldea-geeta', nome: 'Geeta', tipo: 'champion', nivel: 100, pokemon: [956, 673, 976, 713, 983, 970] };
export const REGIONS = [
  { id: 'kanto', nome: 'Kanto', geracao: 1, gyms: GYMS, elite: ELITE, champion: CHAMPION, minSpecies: 1, maxSpecies: 151 },
  { id: 'johto', nome: 'Johto', geracao: 2, gyms: JOHTO_GYMS, elite: JOHTO_ELITE, champion: JOHTO_CHAMPION, minSpecies: 152, maxSpecies: 251 },
  { id: 'hoenn', nome: 'Hoenn', geracao: 3, gyms: HOENN_GYMS, elite: HOENN_ELITE, champion: HOENN_CHAMPION, minSpecies: 252, maxSpecies: 386 },
  { id: 'sinnoh', nome: 'Sinnoh', geracao: 4, gyms: SINNOH_GYMS, elite: SINNOH_ELITE, champion: SINNOH_CHAMPION, minSpecies: 387, maxSpecies: 493 },
  { id: 'unova1', nome: 'Unova 1', geracao: 5, gyms: UNOVA1_GYMS, elite: UNOVA1_ELITE, champion: UNOVA1_CHAMPION, minSpecies: 494, maxSpecies: 649 },
  { id: 'unova2', nome: 'Unova 2', geracao: 5, gyms: UNOVA2_GYMS, elite: UNOVA2_ELITE, champion: UNOVA2_CHAMPION, minSpecies: 494, maxSpecies: 649 },
  { id: 'kalos', nome: 'Kalos', geracao: 6, gyms: KALOS_GYMS, elite: KALOS_ELITE, champion: KALOS_CHAMPION, minSpecies: 650, maxSpecies: 721 },
  { id: 'alola', nome: 'Alola', geracao: 7, gyms: ALOLA_TRIALS, elite: ALOLA_ELITE, champion: ALOLA_CHAMPION, minSpecies: 722, maxSpecies: 809, challengeLabel: 'Provas Insulares', eliteLabel: 'Elite dos 4' },
  { id: 'galar', nome: 'Galar', geracao: 8, gyms: GALAR_GYMS, elite: GALAR_CUP, champion: GALAR_CHAMPION, minSpecies: 810, maxSpecies: 905, eliteLabel: 'Copa dos Campeões' },
  { id: 'paldea', nome: 'Paldea', geracao: 9, gyms: PALDEA_GYMS, elite: PALDEA_ELITE, champion: PALDEA_CHAMPION, minSpecies: 906, maxSpecies: 1025 },
];
export const ALL_CHALLENGES = REGIONS.flatMap((region) => [
  ...region.gyms.map((entry) => ({ ...entry, categoria: 'ginásio', categoriaNome: region.challengeLabel ?? 'ginásio', regiao: region.id })),
  ...region.elite.map((entry) => ({ ...entry, categoria: 'elite', categoriaNome: region.eliteLabel ?? 'Elite dos 4', regiao: region.id })),
  { ...region.champion, categoria: 'campeão', regiao: region.id },
]);

export function regionUnlocked(regionId, completed) {
  if (regionId === 'kanto') return true;
  if (regionId === 'johto') return GYMS.every((leader) => completed.includes(leader.id));
  if (regionId === 'hoenn') return JOHTO_GYMS.every((leader) => completed.includes(leader.id));
  if (regionId === 'sinnoh') return HOENN_GYMS.every((leader) => completed.includes(leader.id));
  if (regionId === 'unova1') return SINNOH_GYMS.every((leader) => completed.includes(leader.id));
  if (regionId === 'unova2') return completed.includes(UNOVA1_CHAMPION.id);
  if (regionId === 'kalos') return completed.includes(UNOVA1_CHAMPION.id) && completed.includes(UNOVA2_CHAMPION.id);
  if (regionId === 'alola') return KALOS_GYMS.every((leader) => completed.includes(leader.id));
  if (regionId === 'galar') return ALOLA_TRIALS.every((leader) => completed.includes(leader.id));
  if (regionId === 'paldea') return GALAR_GYMS.every((leader) => completed.includes(leader.id));
  return false;
}

export const TRAINER_DIFFICULTIES = {
  facil: { nome: 'Fácil', minimo: 2, maximo: 3, nivelMinimo: 20, nivelMaximo: 30, moedas: 1000, itens: [{ itemId: 'poke-ball', quantidade: 2 }, { itemId: 'potion', quantidade: 1 }], nomes: ['Jovem Treinador', 'Escoteira', 'Colecionador'] },
  medio: { nome: 'Médio', minimo: 3, maximo: 4, nivelMinimo: 40, nivelMaximo: 50, moedas: 3000, itens: [{ itemId: 'great-ball', quantidade: 2 }, { itemId: 'super-potion', quantidade: 2 }], nomes: ['Veterana', 'Domador', 'Ace Trainer'] },
  dificil: { nome: 'Difícil', minimo: 6, maximo: 6, nivelMinimo: 100, nivelMaximo: 100, moedas: 10000, itens: [{ itemId: 'ultra-ball', quantidade: 3 }, { itemId: 'hyper-potion', quantidade: 2 }, { itemId: 'revive', quantidade: 1 }], nomes: ['Campeão Errante', 'Lenda da Arena', 'Mestre Pokémon'] },
};

export function rollTrainer(difficulty, catalog = getCatalogo(), rng = randomInt) {
  const rules = TRAINER_DIFFICULTIES[difficulty];
  if (!rules) return null;
  const count = rng(rules.minimo, rules.maximo + 1);
  const pool = catalog.pokemon.filter((entry) => {
    const total = Object.values(entry.atributosBase).reduce((sum, stat) => sum + stat, 0);
    if (difficulty === 'facil') return !entry.lendario && !entry.mitico && wildWeight(entry) === 120 && total <= 400;
    if (difficulty === 'medio') return !entry.lendario && !entry.mitico && total <= 540;
    return true;
  }).map((entry) => entry.id);
  const pokemon = [];
  for (let index = 0; index < count; index++) pokemon.push({ id: pool.splice(rng(pool.length), 1)[0], nivel: rng(rules.nivelMinimo, rules.nivelMaximo + 1) });
  return { nome: rules.nomes[rng(rules.nomes.length)], dificuldade: difficulty, pokemon, recompensa: { moedas: rules.moedas, itens: rules.itens } };
}

export function challengesWithStatus(completed) {
  const beaten = new Set(completed);
  return ALL_CHALLENGES.map((leader) => {
    const region = REGIONS.find((entry) => entry.id === leader.regiao);
    const allGyms = region.gyms.every((entry) => beaten.has(entry.id));
    const unlocked = regionUnlocked(region.id, completed);
    return { ...leader, vencido: beaten.has(leader.id),
      desbloqueado: unlocked && (leader.categoria === 'ginásio' || (leader.categoria === 'elite' ? allGyms && region.elite.slice(0, region.elite.findIndex((entry) => entry.id === leader.id)).every((entry) => beaten.has(entry.id)) : allGyms && region.elite.every((entry) => beaten.has(entry.id)))) };
  });
}

export function wildLevelCap(completed, regionId = 'kanto') {
  const beaten = new Set(completed);
  const region = REGIONS.find((entry) => entry.id === regionId);
  if (!region) return 10;
  if (beaten.has(region.champion.id)) return 100;
  const gymCount = region.gyms.filter((entry) => beaten.has(entry.id)).length;
  const eliteCount = region.elite.filter((entry) => beaten.has(entry.id)).length;
  return Math.min(100, 10 + gymCount * 6 + eliteCount * 12);
}

function stageOf(node, id, depth = 0) {
  if (node.especieId === id) return depth;
  for (const child of node.evolucoes) {
    const found = stageOf(child, id, depth + 1);
    if (found != null) return found;
  }
  return null;
}
export function wildWeight(species) {
  if (species.lendario || species.mitico) return 1;
  const stage = stageOf(species.evolucao, species.id) ?? 0;
  return [120, 30, 5][Math.min(stage, 2)];
}

export function legendaryUnlocked(species, completed) {
  if (!species.lendario && !species.mitico) return true;
  const beaten = new Set(completed);
  return REGIONS.some((region) => species.id >= region.minSpecies && species.id <= region.maxSpecies && region.elite.every((leader) => beaten.has(leader.id)));
}

export function rollWild(catalog = getCatalogo(), rng = randomInt, completed = [], regionId = 'kanto') {
  if (regionId === 'todas') {
    const available = REGIONS.filter((entry) => regionUnlocked(entry.id, completed));
    const pool = catalog.pokemon.filter((entry) => available.some((region) => entry.id >= region.minSpecies && entry.id <= region.maxSpecies) && legendaryUnlocked(entry, completed));
    if (!pool.length) return null;
    const total = pool.reduce((sum, entry) => sum + wildWeight(entry), 0);
    let roll = rng(total);
    for (const entry of pool) { roll -= wildWeight(entry); if (roll < 0) return entry; }
    return pool.at(-1) ?? null;
  }
  const region = REGIONS.find((entry) => entry.id === regionId);
  if (!region || !regionUnlocked(regionId, completed)) return null;
  const pool = catalog.pokemon.filter((entry) => entry.id >= region.minSpecies && entry.id <= region.maxSpecies && legendaryUnlocked(entry, completed));
  if (!pool.length) return null;
  const total = pool.reduce((sum, entry) => sum + wildWeight(entry), 0);
  let roll = rng(total);
  for (const entry of pool) { roll -= wildWeight(entry); if (roll < 0) return entry; }
  return pool.at(-1);
}

export const SHINY_DENOMINATOR = 4096;

export function charmMilestones(completed, generation = 1) {
  const beaten = new Set(completed);
  return Math.max(0, ...REGIONS.filter((entry) => entry.geracao === generation).map((region) => {
    const gymCount = region.gyms.filter((entry) => beaten.has(entry.id)).length;
    return Math.min(10, Math.max(0, gymCount - 3) + region.elite.filter((entry) => beaten.has(entry.id)).length + Number(beaten.has(region.champion.id)));
  }));
}

export function shinyRolls(completed, generation = 1, hasCharm = false) {
  return hasCharm ? 1 + charmMilestones(completed, generation) : 1;
}

export function catchCharmMultiplier(completed, generation = 1, hasCharm = false) {
  return hasCharm ? 1 + charmMilestones(completed, generation) * .03 : 1;
}

export function rollShiny(rng = randomInt, rolls = 1) {
  for (let attempt = 0; attempt < rolls; attempt++) if (rng(SHINY_DENOMINATOR) === 0) return true;
  return false;
}

export function statsFor(species, level, shiny = false) {
  const stats = Object.fromEntries(Object.entries(species.atributosBase).map(([name, base]) => [name,
    Math.floor(((2 * base + 15) * level) / 100) + (name === 'hp' ? level + 10 : 5),
  ]));
  if (shiny) for (const stat of Object.keys(stats)) stats[stat] = Math.floor(stats[stat] * 1.2);
  if (species.gmax) stats.hp = Math.floor(stats.hp * 1.5);
  return stats;
}

export function formFor(species, megaForma, gmaxForma = null) {
  return species.formasMega?.find((form) => form.nome === megaForma) ?? species.formasPrimal?.find((form) => form.nome === megaForma) ?? species.formasFusao?.find((form) => form.nome === megaForma) ?? species.formasGmax?.find((form) => form.nome === gmaxForma) ?? species;
}

export function levelMovesFor(species, level, catalog = getCatalogo()) {
  const damaging = new Map(catalog.golpes.filter((move) => move.poder > 0 && ['physical', 'special'].includes(move.categoria)).map((move) => [move.nome, move]));
  const learned = new Map();
  for (const entry of species.golpesAprendidos) {
    if (entry.metodo !== 'level-up' || entry.nivel > level || !damaging.has(entry.golpe)) continue;
    learned.set(entry.golpe, Math.max(learned.get(entry.golpe) ?? 0, entry.nivel));
  }
  const selected = [...learned].sort((a, b) => b[1] - a[1] || Number(species.tipos.includes(damaging.get(b[0]).tipo)) - Number(species.tipos.includes(damaging.get(a[0]).tipo)) || a[0].localeCompare(b[0])).slice(0, 4).map(([name]) => damaging.get(name));
  return selected.length ? selected : [damaging.get('struggle')].filter(Boolean);
}

export function effectiveness(attackType, defenderTypes, types = getCatalogo().tipos) {
  const rel = types.find((entry) => entry.nome === attackType)?.relacoesDano;
  if (!rel) return 1;
  return defenderTypes.reduce((multiplier, type) => {
    if (rel.no_damage_to.includes(type)) return 0;
    if (rel.double_damage_to.includes(type)) return multiplier * 2;
    if (rel.half_damage_to.includes(type)) return multiplier * .5;
    return multiplier;
  }, 1);
}

export function damage(attacker, defender, move, rng = randomInt) {
  if (move.precisao != null && rng(100) >= move.precisao) return { dano: 0, acerto: false, efetividade: 1 };
  const atk = attacker.stats[move.categoria === 'physical' ? 'attack' : 'special-attack'];
  const def = Math.max(1, defender.stats[move.categoria === 'physical' ? 'defense' : 'special-defense']);
  const stab = attacker.tipos.includes(move.tipo) ? 1.5 : 1;
  const effect = effectiveness(move.tipo, defender.tipos);
  if (!effect) return { dano: 0, acerto: true, efetividade: 0 };
  const variance = (85 + rng(16)) / 100;
  const crit = rng(16) === 0 ? 1.5 : 1;
  const dano = Math.max(1, Math.floor((Math.floor((2 * attacker.nivel / 5 + 2) * move.poder * atk / def / 50) + 2) * stab * effect * variance * crit));
  return { dano, acerto: true, efetividade: effect, critico: crit > 1 };
}

export function makeCombatant(speciesId, level, shiny, moves, id = null, apelido = null, megaForma = null, gmaxForma = null) {
  const species = getEspecie(speciesId);
  const form = formFor(species, megaForma, gmaxForma);
  const stats = statsFor(form, level, shiny);
  return { pokemonId: id, especieId: speciesId, megaForma, gmaxForma, nome: apelido || form.nomeExibicao, nivel: level, shiny, tipos: form.tipos, stats, hp: stats.hp, maxHp: stats.hp, ataques: moves.map((entry) => ({ ...entry })) };
}
