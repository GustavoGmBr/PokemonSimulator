import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { levelMovesFor } from '../src/services/battleRules.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const cache = path.join(root, '.cache/pokeapi');
const assets = path.join(root, 'public/pokemon');
const itemAssets = path.join(root, 'public/items');
const typeAssets = path.join(root, 'public/types');
const dataDir = path.join(root, 'data');
await Promise.all([mkdir(cache, { recursive: true }), mkdir(assets, { recursive: true }), mkdir(itemAssets, { recursive: true }), mkdir(typeAssets, { recursive: true }), mkdir(dataDir, { recursive: true })]);
const force = process.argv.includes('--refresh');
const MAX_SPECIES = 1025;
const pending = new Map();

async function download(url) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status}: ${url}`), { status: response.status });
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
      if (error.status === 404) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
  throw lastError;
}

function api(url) {
  if (pending.has(url)) return pending.get(url);
  const promise = (async () => {
    const key = new URL(url).pathname.replaceAll('/', '_');
    const destination = path.join(cache, `${key}.json`);
    if (!force) {
      try { return JSON.parse(await readFile(destination, 'utf8')); } catch {}
    }
    const parsed = JSON.parse((await download(url)).toString('utf8'));
    await writeFile(destination, JSON.stringify(parsed));
    return parsed;
  })();
  pending.set(url, promise);
  return promise;
}

async function sprite(url, id, variant) {
  if (!url) throw new Error(`Sprite ausente: ${id}/${variant}`);
  const extension = new URL(url).pathname.endsWith('.gif') ? 'gif' : 'png';
  const localPath = `/assets/pokemon/${id}-${variant}.${extension}`;
  const destination = path.join(assets, `${id}-${variant}.${extension}`);
  if (!force) {
    try { if ((await readFile(destination)).length > 8) return localPath; } catch {}
  }
  const buffer = await download(url);
  const valid = extension === 'gif' ? /^GIF8[79]a$/.test(buffer.subarray(0, 6).toString()) : buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
  if (!valid) throw new Error(`Imagem invalida: ${id}/${variant}`);
  await writeFile(destination, buffer);
  return localPath;
}

async function pool(items, task, concurrency = 5) {
  let index = 0;
  const result = new Array(items.length);
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (index < items.length) {
      const current = index++;
      result[current] = await task(items[current]);
    }
  }));
  return result;
}

const eeveeStones = { espeon: 'shiny-stone', umbreon: 'dusk-stone', leafeon: 'leaf-stone', glaceon: 'ice-stone', sylveon: 'dawn-stone' };
function evolution(node, parentName = null) {
  const stone = parentName === 'eevee' ? eeveeStones[node.species.name] : null;
  return {
    especieId: Number(node.species.url.split('/').filter(Boolean).at(-1)),
    nome: node.species.name,
    condicoes: stone ? [{ gatilho: 'use-item', item: stone }] : node.evolution_details.map((detail) => ({
      gatilho: detail.trigger.name, nivel: detail.min_level, item: detail.item?.name ?? null,
      felicidade: detail.min_happiness, periodo: detail.time_of_day,
      genero: detail.gender, itemSegurado: detail.held_item?.name ?? null,
      local: detail.location?.name ?? null, golpeConhecido: detail.known_move?.name ?? null,
      tipoGolpeConhecido: detail.known_move_type?.name ?? null,
      beleza: detail.min_beauty, afeto: detail.min_affection,
      chuva: detail.needs_overworld_rain, atributosRelativos: detail.relative_physical_stats,
      especieNoTime: detail.party_species?.name ?? null, tipoNoTime: detail.party_type?.name ?? null,
      especieNaTroca: detail.trade_species?.name ?? null, inverterConsole: detail.turn_upside_down,
    })),
    evolucoes: node.evolves_to.map((child) => evolution(child, node.species.name)),
  };
}

let completed = 0;
const pokemon = await pool(Array.from({ length: MAX_SPECIES }, (_, index) => index + 1), async (id) => {
  const info = await api(`https://pokeapi.co/api/v2/pokemon/${id}/`);
  const species = await api(info.species.url);
  const chain = await api(species.evolution_chain.url);
  const growth = await api(species.growth_rate.url);
  const sprites = {};
  for (const [variant, url] of Object.entries({
    front: info.sprites.front_default, back: info.sprites.back_default, artwork: info.sprites.other['official-artwork'].front_default,
    frontShiny: info.sprites.front_shiny, backShiny: info.sprites.back_shiny,
    artworkShiny: info.sprites.other['official-artwork'].front_shiny,
    home: info.sprites.other.home.front_default, homeShiny: info.sprites.other.home.front_shiny,
    animated: info.sprites.other.showdown.front_default, animatedShiny: info.sprites.other.showdown.front_shiny,
    animatedBack: info.sprites.other.showdown.back_default ?? info.sprites.back_default,
    animatedBackShiny: info.sprites.other.showdown.back_shiny ?? info.sprites.back_shiny,
  })) {
    const fallback = variant.includes('Shiny') ? info.sprites.front_shiny ?? info.sprites.front_default : info.sprites.front_default ?? info.sprites.other['official-artwork'].front_default;
    sprites[variant] = await sprite(url ?? fallback, id, variant);
  }
  const preferredVersion = id <= 151 ? 'firered-leafgreen' : id <= 251 ? 'heartgold-soulsilver' : id <= 386 ? 'omega-ruby-alpha-sapphire' : id <= 493 ? 'platinum' : id <= 649 ? 'black-white' : id <= 721 ? 'x-y' : id <= 809 ? 'ultra-sun-ultra-moon' : id <= 905 ? 'sword-shield' : 'scarlet-violet';
  const availableVersions = [...new Set(info.moves.flatMap((entry) => entry.version_group_details.map((detail) => detail.version_group.name)))];
  const selectedVersion = availableVersions.includes(preferredVersion) ? preferredVersion : availableVersions.at(-1);
  const learnset = info.moves.flatMap((entry) => entry.version_group_details
    .filter((detail) => detail.version_group.name === selectedVersion)
    .map((detail) => ({ golpe: entry.move.name, url: entry.move.url, metodo: detail.move_learn_method.name, nivel: detail.level_learned_at })));
  completed++;
  if (completed % 10 === 0 || completed === MAX_SPECIES) console.log(`Pokemon e sprites: ${completed}/${MAX_SPECIES}`);
  return {
    id, nome: info.name, nomeExibicao: species.names.find((entry) => entry.language.name === 'en')?.name ?? info.name,
    tipos: info.types.sort((a, b) => a.slot - b.slot).map((entry) => entry.type.name),
    atributosBase: Object.fromEntries(info.stats.map((entry) => [entry.stat.name, entry.base_stat])),
    altura: info.height / 10, peso: info.weight / 10, experienciaBase: info.base_experience,
    taxaCaptura: species.capture_rate, felicidadeBase: species.base_happiness,
    proporcaoFemeas: species.gender_rate, lendario: species.is_legendary, mitico: species.is_mythical,
    habilidades: info.abilities.map((entry) => ({ nome: entry.ability.name, oculta: entry.is_hidden })),
    crescimento: growth.name, experienciaPorNivel: growth.levels.map((entry) => ({ nivel: entry.level, experiencia: entry.experience })),
    evolucao: evolution(chain.chain), sprites, golpesAprendidos: learnset, versaoAprendizado: selectedVersion,
  };
});

const megaStoneByForm = {
  'venusaur-mega': 'venusaurite', 'charizard-mega-x': 'charizardite-x', 'charizard-mega-y': 'charizardite-y',
  'blastoise-mega': 'blastoisinite', 'beedrill-mega': 'beedrillite', 'pidgeot-mega': 'pidgeotite',
  'raichu-mega-x': 'raichunite-x', 'raichu-mega-y': 'raichunite-y', 'clefable-mega': 'clefablite',
  'alakazam-mega': 'alakazite', 'victreebel-mega': 'victreebelite', 'slowbro-mega': 'slowbronite',
  'gengar-mega': 'gengarite', 'kangaskhan-mega': 'kangaskhanite', 'starmie-mega': 'starminite',
  'pinsir-mega': 'pinsirite', 'gyarados-mega': 'gyaradosite', 'aerodactyl-mega': 'aerodactylite',
  'dragonite-mega': 'dragoninite', 'mewtwo-mega-x': 'mewtwonite-x', 'mewtwo-mega-y': 'mewtwonite-y',
  'ampharos-mega': 'ampharosite', 'steelix-mega': 'steelixite', 'scizor-mega': 'scizorite',
  'heracross-mega': 'heracronite', 'houndoom-mega': 'houndoominite', 'tyranitar-mega': 'tyranitarite',
  'meganium-mega': 'meganiumite', 'feraligatr-mega': 'feraligatrite', 'skarmory-mega': 'skarmorite',
  'sceptile-mega': 'sceptilite', 'blaziken-mega': 'blazikenite', 'swampert-mega': 'swampertite',
  'gardevoir-mega': 'gardevoirite', 'sableye-mega': 'sablenite', 'mawile-mega': 'mawilite',
  'aggron-mega': 'aggronite', 'medicham-mega': 'medichamite', 'manectric-mega': 'manectite',
  'sharpedo-mega': 'sharpedonite', 'camerupt-mega': 'cameruptite', 'altaria-mega': 'altarianite',
  'banette-mega': 'banettite', 'chimecho-mega': 'chimechite', 'absol-mega': 'absolite',
  'absol-mega-z': 'absolite-z', 'glalie-mega': 'glalitite', 'salamence-mega': 'salamencite',
  'metagross-mega': 'metagrossite', 'latias-mega': 'latiasite', 'latios-mega': 'latiosite',
  'rayquaza-mega': 'rayquazatrite',
  'staraptor-mega': 'staraptorite', 'lopunny-mega': 'lopunnite',
  'garchomp-mega': 'garchompite', 'garchomp-mega-z': 'garchompite-z',
  'lucario-mega': 'lucarionite', 'lucario-mega-z': 'lucarionite-z',
  'abomasnow-mega': 'abomasite', 'gallade-mega': 'galladite',
  'froslass-mega': 'froslassite', 'heatran-mega': 'heatranite', 'darkrai-mega': 'darkrainite',
  'groudon-primal': 'red-orb', 'kyogre-primal': 'blue-orb',
  'emboar-mega': 'emboarite', 'excadrill-mega': 'excadrillite', 'audino-mega': 'audinite',
  'scolipede-mega': 'scolipedite', 'scrafty-mega': 'scraftite', 'eelektross-mega': 'eelektrossite',
  'chandelure-mega': 'chandelurite', 'golurk-mega': 'golurkite',
};
const megaForms = [];
for (const species of pokemon) {
  const source = await api(`https://pokeapi.co/api/v2/pokemon-species/${species.id}/`);
  for (const variety of source.varieties.filter((entry) => entry.pokemon.name.includes('-mega') || entry.pokemon.name.endsWith('-primal'))) {
    const itemId = megaStoneByForm[variety.pokemon.name] ?? `${variety.pokemon.name.replace(/-mega(?:-[a-z])?$/, '')}ite${variety.pokemon.name.match(/-mega-([a-z])$/)?.[1] ? `-${variety.pokemon.name.at(-1)}` : ''}`;
    megaStoneByForm[variety.pokemon.name] = itemId;
    megaForms.push({ species, variety, itemId });
  }
}
console.log(`Importando ${megaForms.length} formas Mega/Primal...`);
await pool(megaForms, async ({ species, variety, itemId }) => {
  const form = await api(variety.pokemon.url);
  const urls = {
    front: form.sprites.front_default, back: form.sprites.back_default,
    artwork: form.sprites.other['official-artwork'].front_default,
    frontShiny: form.sprites.front_shiny, backShiny: form.sprites.back_shiny,
    artworkShiny: form.sprites.other['official-artwork'].front_shiny,
    home: form.sprites.other.home.front_default, homeShiny: form.sprites.other.home.front_shiny,
    animated: form.sprites.other.showdown.front_default, animatedShiny: form.sprites.other.showdown.front_shiny,
    animatedBack: form.sprites.other.showdown.back_default ?? form.sprites.back_default,
    animatedBackShiny: form.sprites.other.showdown.back_shiny ?? form.sprites.back_shiny,
  };
  const sprites = {};
  for (const [variant, url] of Object.entries(urls)) {
    const fallback = variant.includes('Shiny') ? urls.homeShiny ?? urls.frontShiny ?? urls.home ?? urls.front : urls.home ?? urls.front;
    sprites[variant] = await sprite(url ?? fallback, form.id, variant);
  }
  const primal = form.name.endsWith('-primal');
  species[primal ? 'formasPrimal' : 'formasMega'] ??= [];
  species[primal ? 'formasPrimal' : 'formasMega'].push({ nome: form.name, nomeExibicao: primal ? `Primal ${species.nomeExibicao}` : form.name.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()), itemId,
    tipos: form.types.sort((a, b) => a.slot - b.slot).map((entry) => entry.type.name),
    atributosBase: Object.fromEntries(form.stats.map((entry) => [entry.stat.name, entry.base_stat])), sprites });
}, 4);
for (const species of pokemon) { species.formasMega ??= []; species.formasPrimal ??= []; }

const gmaxForms = [];
for (const species of pokemon) {
  const source = await api(`https://pokeapi.co/api/v2/pokemon-species/${species.id}/`);
  for (const variety of source.varieties.filter((entry) => entry.pokemon.name.endsWith('-gmax'))) gmaxForms.push({ species, variety });
}
console.log(`Importando ${gmaxForms.length} formas G-Max...`);
await pool(gmaxForms, async ({ species, variety }) => {
  const form = await api(variety.pokemon.url);
  const urls = {
    front: form.sprites.front_default, back: form.sprites.back_default,
    artwork: form.sprites.other['official-artwork'].front_default,
    frontShiny: form.sprites.front_shiny, backShiny: form.sprites.back_shiny,
    artworkShiny: form.sprites.other['official-artwork'].front_shiny,
    home: form.sprites.other.home.front_default, homeShiny: form.sprites.other.home.front_shiny,
    animated: form.sprites.other.showdown.front_default, animatedShiny: form.sprites.other.showdown.front_shiny,
    animatedBack: form.sprites.other.showdown.back_default ?? form.sprites.back_default,
    animatedBackShiny: form.sprites.other.showdown.back_shiny ?? form.sprites.back_shiny,
  };
  const sprites = {};
  for (const [variant, url] of Object.entries(urls)) {
    const fallback = variant.includes('Shiny') ? urls.homeShiny ?? urls.frontShiny ?? urls.home ?? urls.front : urls.home ?? urls.front;
    sprites[variant] = await sprite(url ?? fallback, form.id, variant);
  }
  species.formasGmax ??= [];
  species.formasGmax.push({ nome: form.name, nomeExibicao: `G-Max ${species.nomeExibicao}`, itemId: 'gmax-stone', gmax: true,
    tipos: form.types.sort((a, b) => a.slot - b.slot).map((entry) => entry.type.name),
    atributosBase: Object.fromEntries(form.stats.map((entry) => [entry.stat.name, entry.base_stat])), sprites });
}, 4);
for (const species of pokemon) species.formasGmax ??= [];

const necrozma = pokemon[799];
necrozma.formasFusao = [];
for (const [name, label, partners, itemId] of [
  ['necrozma-dusk', 'Necrozma Juba Crepúsculo', [791], null],
  ['necrozma-dawn', 'Necrozma Asas Alvorada', [792], null],
  ['necrozma-ultra', 'Ultra Necrozma', [791, 792], 'ultra-burst-stone'],
]) {
  const form = await api(`https://pokeapi.co/api/v2/pokemon/${name}/`);
  const urls = {
    front: form.sprites.front_default, back: form.sprites.back_default,
    artwork: form.sprites.other['official-artwork'].front_default,
    frontShiny: form.sprites.front_shiny, backShiny: form.sprites.back_shiny,
    artworkShiny: form.sprites.other['official-artwork'].front_shiny,
    home: form.sprites.other.home.front_default, homeShiny: form.sprites.other.home.front_shiny,
    animated: form.sprites.other.showdown.front_default, animatedShiny: form.sprites.other.showdown.front_shiny,
    animatedBack: form.sprites.other.showdown.back_default ?? form.sprites.back_default,
    animatedBackShiny: form.sprites.other.showdown.back_shiny ?? form.sprites.back_shiny,
  };
  const sprites = {};
  for (const [variant, url] of Object.entries(urls)) {
    const fallback = variant.includes('Shiny') ? urls.homeShiny ?? urls.frontShiny ?? urls.home ?? urls.front : urls.home ?? urls.front;
    sprites[variant] = await sprite(url ?? fallback, form.id, variant);
  }
  necrozma.formasFusao.push({ nome: name, nomeExibicao: label, parceiros: partners, itemId,
    tipos: form.types.sort((a, b) => a.slot - b.slot).map((entry) => entry.type.name),
    atributosBase: Object.fromEntries(form.stats.map((entry) => [entry.stat.name, entry.base_stat])), sprites });
}
for (const species of pokemon) species.formasFusao ??= [];

const moveUrls = [...new Map(pokemon.flatMap((entry) => entry.golpesAprendidos.map((move) => [move.golpe, move.url])).concat([['struggle', 'https://pokeapi.co/api/v2/move/struggle/']])).values()];
console.log(`Importando ${moveUrls.length} golpes...`);
const golpes = await pool(moveUrls, async (url) => {
  const move = await api(url);
  return {
    id: move.id, nome: move.name, tipo: move.type.name, categoria: move.damage_class.name,
    poder: move.power, precisao: move.accuracy, pp: move.pp, prioridade: move.priority,
    alvo: move.target.name, efeitoId: move.effect_entries[0]?.effect ?? null,
    chanceEfeito: move.effect_chance, meta: move.meta,
    alteracoesAtributos: move.stat_changes.map((entry) => ({ atributo: entry.stat.name, mudanca: entry.change })),
  };
});
const tipos = await pool(['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'], async (name) => {
  const type = await api(`https://pokeapi.co/api/v2/type/${name}/`);
  const swordShield = type.sprites?.['generation-viii']?.['sword-shield'];
  if (!swordShield?.name_icon || !swordShield?.symbol_icon) throw new Error(`Ícones Sword/Shield ausentes para ${name}`);
  for (const [size, url] of [['large', swordShield.name_icon], ['small', swordShield.symbol_icon]]) {
    const destination = path.join(typeAssets, `${name}-${size}.png`);
    let exists = false;
    if (!force) { try { exists = (await readFile(destination)).length > 8; } catch {} }
    if (!exists) {
      const buffer = await download(url);
      if (buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Ícone inválido: ${name}/${size}`);
      await writeFile(destination, buffer);
    }
  }
  return { nome: name, relacoesDano: Object.fromEntries(Object.entries(type.damage_relations).map(([key, values]) => [key, values.map((entry) => entry.name)])), sprites: { large: `/assets/types/${name}-large.png`, small: `/assets/types/${name}-small.png` } };
});
const itemDefinitions = [
  ['poke-ball', 'Poké Bola', 'captura', 'Usada para capturar Pokémon selvagens.'],
  ['great-ball', 'Grande Bola', 'captura', 'Uma bola com maior eficiência de captura.'],
  ['ultra-ball', 'Ultra Bola', 'captura', 'Uma bola com alta eficiência de captura.'],
  ['master-ball', 'Master Bola', 'captura', 'Uma bola que garante a captura de um Pokémon selvagem.'],
  ['potion', 'Poção', 'cura', 'Recupera parte do HP de um Pokémon.'],
  ['super-potion', 'Superpoção', 'cura', 'Recupera mais HP que uma Poção.'],
  ['hyper-potion', 'Hiperpoção', 'cura', 'Recupera uma grande quantidade de HP.'],
  ['max-potion', 'Poção Máxima', 'cura', 'Recupera todo o HP de um Pokémon.'],
  ['full-restore', 'Restauração Total', 'cura', 'Recupera todo o HP de um Pokémon.'],
  ['revive', 'Reviver', 'cura', 'Reanima um Pokémon desmaiado com parte do HP.'],
  ['max-revive', 'Reviver Máximo', 'cura', 'Reanima um Pokémon desmaiado com HP cheio.'],
  ['rare-candy', 'Doce Raro', 'treino', 'Aumenta o nível de um Pokémon.'],
  ['lucky-egg', 'Lucky Egg', 'buff', 'Dobra a experiência recebida nas batalhas enquanto estiver na mochila.'],
  ['amulet-coin', 'Amulet Coin', 'buff', 'Dobra o dinheiro recebido em vitórias enquanto estiver na mochila.'],
  ['shiny-charm', 'Shiny Charm', 'buff', 'Aumenta as rolagens shiny conforme os desafios da região vencidos.'],
  ['catching-charm', 'Catch Charm', 'buff', 'Aumenta a chance de captura conforme os desafios da região vencidos, até 30%.'],
  ['fire-stone', 'Pedra de Fogo', 'evolucao', 'Permite determinadas evoluções de Pokémon.'],
  ['water-stone', 'Pedra de Água', 'evolucao', 'Permite determinadas evoluções de Pokémon.'],
  ['thunder-stone', 'Pedra do Trovão', 'evolucao', 'Permite determinadas evoluções de Pokémon.'],
  ['leaf-stone', 'Pedra de Folha', 'evolucao', 'Permite determinadas evoluções de Pokémon.'],
  ['moon-stone', 'Pedra da Lua', 'evolucao', 'Permite determinadas evoluções de Pokémon.'],
  ['sun-stone', 'Pedra do Sol', 'evolucao', 'Permite determinadas evoluções de Pokémon de Johto.'],
  ['kings-rock', 'Pedra do Rei', 'evolucao', 'Permite evoluções que originalmente exigem troca com este item.'],
  ['metal-coat', 'Revestimento Metálico', 'evolucao', 'Permite evoluções que originalmente exigem troca com este item.'],
  ['dragon-scale', 'Escama de Dragão', 'evolucao', 'Permite evoluções que originalmente exigem troca com este item.'],
  ['up-grade', 'Melhoria', 'evolucao', 'Permite evoluir Porygon para Porygon2.'],
  ['deep-sea-scale', 'Escama Marinha', 'evolucao', 'Permite evoluir Clamperl para Gorebyss.'],
  ['deep-sea-tooth', 'Dente Marinho', 'evolucao', 'Permite evoluir Clamperl para Huntail.'],
  ['shiny-stone', 'Pedra Brilhante', 'evolucao', 'Permite determinadas evoluções de Sinnoh.'],
  ['dusk-stone', 'Pedra do Crepúsculo', 'evolucao', 'Permite determinadas evoluções de Sinnoh.'],
  ['dawn-stone', 'Pedra da Alvorada', 'evolucao', 'Permite determinadas evoluções de Sinnoh.'],
  ['ice-stone', 'Pedra de Gelo', 'evolucao', 'Permite determinadas evoluções de Sinnoh.'],
  ['razor-claw', 'Garra Afiada', 'evolucao', 'Permite evoluir Sneasel.'],
  ['razor-fang', 'Presa Afiada', 'evolucao', 'Permite evoluir Gligar.'],
  ['protector', 'Protetor', 'evolucao', 'Permite evoluir Rhydon.'],
  ['electirizer', 'Eletrizador', 'evolucao', 'Permite evoluir Electabuzz.'],
  ['magmarizer', 'Magmarizador', 'evolucao', 'Permite evoluir Magmar.'],
  ['dubious-disc', 'Disco Duvidoso', 'evolucao', 'Permite evoluir Porygon2.'],
  ['reaper-cloth', 'Tecido Ceifador', 'evolucao', 'Permite evoluir Dusclops.'],
  ['linking-cord', 'Cabo de Ligação', 'evolucao', 'Permite evoluções que originalmente exigem troca.'],
  ...[...new Set(Object.values(megaStoneByForm))].map((name) => [name, name === 'rayquazatrite' ? 'Mega Rayquazatrite' : name === 'red-orb' ? 'Orbe Vermelho' : name === 'blue-orb' ? 'Orbe Azul' : name.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()), ['red-orb', 'blue-orb'].includes(name) ? 'primal' : 'mega', name === 'rayquazatrite' ? 'Mega Pedra de uso único: permite Mega Evolução permanente de Rayquaza a partir do nível 60.' : ['red-orb', 'blue-orb'].includes(name) ? 'Orbe de uso único: permite Regressão Primal permanente a partir do nível 60.' : 'Mega Pedra de uso único: permite Mega Evolução permanente a partir do nível 60.']),
];
const itens = await pool(itemDefinitions, async ([nome, nomeExibicao, categoria, descricao]) => {
  // Algumas Mega Pedras recentes ainda não possuem endpoint de item na PokéAPI.
  const localMegaStone = ['meganiumite', 'feraligatrite', 'skarmorite', 'staraptorite', 'darkrainite', 'excadrillite', 'scolipedite', 'scraftite', 'rayquazatrite'].includes(nome);
  let item = null;
  if (!localMegaStone) {
    try { item = await api(`https://pokeapi.co/api/v2/item/${nome}/`); }
    catch (error) { if (error.status !== 404 || !Object.values(megaStoneByForm).includes(nome)) throw error; }
  }
  const destination = path.join(itemAssets, `${nome}.png`);
  let existing = false;
  if (!force) { try { existing = (await readFile(destination)).length > 8; } catch {} }
  if (!existing && item?.sprites.default) {
    const buffer = await download(item.sprites.default);
    if (buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Item invalido: ${nome}`);
    await writeFile(destination, buffer);
  }
  const prices = { 'poke-ball': 200, 'great-ball': 600, 'ultra-ball': 1200, potion: 300, 'super-potion': 700, 'hyper-potion': 1200, 'max-potion': 2500, 'full-restore': 3000, revive: 1500, 'max-revive': 4000, 'lucky-egg': 50000, 'amulet-coin': 50000, 'shiny-charm': 150000, 'catching-charm': 100000 };
  return { id: item?.id ?? nome, nome, nomeExibicao, categoria, descricao: ['evolucao', 'mega', 'primal'].includes(categoria) && !descricao.includes('uso único') ? `${descricao} Consumido ao usar.` : descricao, precoReferencia: item?.cost ?? null, sprite: nome === 'rayquazatrite' ? '/assets/items/rayquazatrite.svg' : item?.sprites.default ? `/assets/items/${nome}.png` : `/assets/items/mega-stone.svg`, precoLoja: ['master-ball', 'rare-candy'].includes(nome) ? null : prices[nome] ?? (['red-orb', 'blue-orb'].includes(nome) ? 100000 : Object.values(megaStoneByForm).includes(nome) ? 50000 : 500) };
});
for (const [nome, nomeExibicao, experiencia] of [['exp-candy-p', 'Doce de EXP P', 800], ['exp-candy-m', 'Doce de EXP M', 3000], ['exp-candy-g', 'Doce de EXP G', 10000], ['exp-candy-gg', 'Doce de EXP GG', 30000]]) {
  itens.push({ id: nome, nome, nomeExibicao, categoria: 'treino', descricao: `Concede ${experiencia.toLocaleString('pt-BR')} XP a um Pokémon da coleção.`, precoReferencia: null, sprite: '/assets/items/exp-candy.svg', precoLoja: null });
}
itens.push({ id: 'gmax-stone', nome: 'gmax-stone', nomeExibicao: 'Pedra G-Max', categoria: 'evolucao', descricao: 'Pedra universal de uso único para uma transformação G-Max permanente em espécies compatíveis. Amplia o HP máximo em 50%.', precoReferencia: null, sprite: '/assets/items/gmax-stone.svg', precoLoja: 75000 });
itens.push({ id: 'ultra-burst-stone', nome: 'ultra-burst-stone', nomeExibicao: 'Pedra Ultra Burst', categoria: 'evolucao', descricao: 'Pedra de uso único: transforma Necrozma em Ultra Necrozma permanentemente quando Solgaleo e Lunala estão na coleção.', precoReferencia: null, sprite: '/assets/items/ultra-burst-stone.svg', precoLoja: 150000 });
for (const entry of pokemon) for (const move of entry.golpesAprendidos) delete move.url;
const catalog = {
  versao: 10, fonte: 'https://pokeapi.co', importadoEm: new Date().toISOString(),
  regras: { especies: 'generation-i/ii/iii/iv/v/vi/vii/viii/ix', aprendizado: { kanto: 'firered-leafgreen', johto: 'heartgold-soulsilver', hoenn: 'omega-ruby-alpha-sapphire', sinnoh: 'platinum', unova: 'black-white', kalos: 'x-y', alola: 'ultra-sun-ultra-moon', galar: 'sword-shield', paldea: 'scarlet-violet' }, atributosTiposEGolpes: 'atuais da PokeAPI' },
  pokemon, golpes: golpes.sort((a, b) => a.id - b.id), tipos, itens,
};
const temporary = path.join(dataDir, 'catalogo.json.tmp');
await writeFile(temporary, JSON.stringify(catalog, null, 2));
await rename(temporary, path.join(dataDir, 'catalogo.json'));
console.log(`Catalogo local pronto: ${pokemon.length} Pokemon, ${golpes.length} golpes, ${tipos.length} tipos, ${itens.length} itens e ${pokemon.reduce((total, entry) => total + Object.keys(entry.sprites).length, 0)} imagens de Pokemon.`);
