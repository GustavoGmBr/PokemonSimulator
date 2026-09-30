import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { getCatalogo } from '../src/services/catalogo.js';
import { CHAMPION, ELITE, GYMS, JOHTO_CHAMPION, JOHTO_ELITE, JOHTO_GYMS, HOENN_CHAMPION, HOENN_ELITE, HOENN_GYMS, SINNOH_CHAMPION, SINNOH_ELITE, SINNOH_GYMS, UNOVA1_CHAMPION, UNOVA1_ELITE, UNOVA1_GYMS, UNOVA2_CHAMPION, UNOVA2_ELITE, UNOVA2_GYMS, KALOS_GYMS, KALOS_CHAMPION, ALOLA_TRIALS, ALOLA_CHAMPION, GALAR_GYMS, GALAR_CHAMPION, PALDEA_GYMS, PALDEA_CHAMPION, REGIONS, TRAINER_DIFFICULTIES, catchCharmMultiplier, challengesWithStatus, charmMilestones, damage, effectiveness, formFor, legendaryUnlocked, levelMovesFor, regionUnlocked, rollShiny, rollTrainer, rollWild, shinyRolls, statsFor, wildLevelCap, wildWeight } from '../src/services/battleRules.js';
import { healCombatant } from '../src/services/itemRules.js';
import { evolutionOptions } from '../src/services/evolutions.js';
import { TOURNAMENTS, rollTournament } from '../src/services/tournaments.js';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';

test('encontros respeitam pesos de evolucao, limite e probabilidade shiny', () => {
  const catalog = getCatalogo();
  assert.equal(wildWeight(catalog.pokemon[0]), 120);
  assert.equal(wildWeight(catalog.pokemon[1]), 30);
  assert.equal(wildWeight(catalog.pokemon[2]), 5);
  assert.equal(wildWeight(catalog.pokemon[143]), 1);
  assert.equal(rollWild(catalog, () => 0).id, 1);
  assert.ok(rollWild(catalog, (total) => total - 1).id <= 151);
  assert.equal(rollWild(catalog, () => 0, [], 'johto'), null);
  assert.equal(rollWild(catalog, () => 0, GYMS.map((entry) => entry.id), 'johto').id, 152);
  assert.equal(rollWild(catalog, () => 0, GYMS.map((entry) => entry.id), 'hoenn'), null);
  assert.equal(rollWild(catalog, () => 0, JOHTO_GYMS.map((entry) => entry.id), 'hoenn').id, 252);
  assert.equal(rollWild(catalog, () => 0, JOHTO_GYMS.map((entry) => entry.id), 'sinnoh'), null);
  assert.equal(rollWild(catalog, () => 0, HOENN_GYMS.map((entry) => entry.id), 'sinnoh').id, 387);
  assert.equal(rollWild(catalog, () => 0, [], 'unova1'), null);
  assert.equal(rollWild(catalog, () => 0, SINNOH_GYMS.map((entry) => entry.id), 'unova1').id, 495);
  assert.equal(rollWild(catalog, () => 0, SINNOH_GYMS.map((entry) => entry.id), 'unova2'), null);
  assert.equal(rollWild(catalog, (total) => total - 1, SINNOH_GYMS.map((entry) => entry.id), 'todas').id, 637);
  assert.equal(rollShiny(() => 0), true);
  assert.equal(rollShiny(() => 1), false);
  assert.equal(wildLevelCap([]), 10);
  assert.equal(wildLevelCap(GYMS.map((entry) => entry.id)), 58);
  assert.equal(wildLevelCap([...GYMS, ...ELITE].map((entry) => entry.id)), 100);
  assert.equal(wildLevelCap([CHAMPION.id]), 100);
  const status = challengesWithStatus([]);
  assert.equal(status.find((entry) => entry.id === 'brock').desbloqueado, true);
  assert.equal(status.find((entry) => entry.id === 'lorelei').desbloqueado, false);
  assert.equal(challengesWithStatus(GYMS.map((entry) => entry.id)).find((entry) => entry.id === 'lorelei').desbloqueado, true);
  assert.equal(challengesWithStatus([...GYMS, ...ELITE].map((entry) => entry.id)).find((entry) => entry.id === 'blue').desbloqueado, true);
  assert.equal(regionUnlocked('johto', GYMS.slice(0, 7).map((entry) => entry.id)), false);
  assert.equal(regionUnlocked('johto', GYMS.map((entry) => entry.id)), true);
  assert.equal(regionUnlocked('hoenn', JOHTO_GYMS.slice(0, 7).map((entry) => entry.id)), false);
  assert.equal(regionUnlocked('hoenn', JOHTO_GYMS.map((entry) => entry.id)), true);
  assert.equal(regionUnlocked('sinnoh', HOENN_GYMS.slice(0, 7).map((entry) => entry.id)), false);
  assert.equal(regionUnlocked('sinnoh', HOENN_GYMS.map((entry) => entry.id)), true);
  assert.equal(regionUnlocked('unova1', SINNOH_GYMS.map((entry) => entry.id)), true);
  assert.equal(regionUnlocked('unova2', UNOVA1_GYMS.map((entry) => entry.id)), false);
  assert.equal(regionUnlocked('unova2', [UNOVA1_CHAMPION.id]), true);
  assert.equal(challengesWithStatus([]).find((entry) => entry.id === 'johto-falkner').desbloqueado, false);
  assert.equal(challengesWithStatus(GYMS.map((entry) => entry.id)).find((entry) => entry.id === 'johto-falkner').desbloqueado, true);
  assert.equal(challengesWithStatus([...GYMS, ...JOHTO_GYMS].map((entry) => entry.id)).find((entry) => entry.id === 'johto-will').desbloqueado, true);
  assert.equal(challengesWithStatus([...GYMS, ...JOHTO_GYMS, ...JOHTO_ELITE].map((entry) => entry.id)).find((entry) => entry.id === JOHTO_CHAMPION.id).desbloqueado, true);
  assert.equal(challengesWithStatus(JOHTO_GYMS.map((entry) => entry.id)).find((entry) => entry.id === 'hoenn-roxanne').desbloqueado, true);
  assert.equal(challengesWithStatus([...JOHTO_GYMS, ...HOENN_GYMS].map((entry) => entry.id)).find((entry) => entry.id === 'hoenn-sidney').desbloqueado, true);
  assert.equal(challengesWithStatus([...JOHTO_GYMS, ...HOENN_GYMS, ...HOENN_ELITE].map((entry) => entry.id)).find((entry) => entry.id === HOENN_CHAMPION.id).desbloqueado, true);
  assert.equal(challengesWithStatus(HOENN_GYMS.map((entry) => entry.id)).find((entry) => entry.id === 'sinnoh-roark').desbloqueado, true);
  assert.equal(challengesWithStatus([...HOENN_GYMS, ...SINNOH_GYMS].map((entry) => entry.id)).find((entry) => entry.id === 'sinnoh-aaron').desbloqueado, true);
  assert.equal(challengesWithStatus([...HOENN_GYMS, ...SINNOH_GYMS, ...SINNOH_ELITE].map((entry) => entry.id)).find((entry) => entry.id === SINNOH_CHAMPION.id).desbloqueado, true);
  assert.equal(challengesWithStatus(SINNOH_GYMS.map((entry) => entry.id)).find((entry) => entry.id === 'unova1-cilan').desbloqueado, true);
  assert.equal(challengesWithStatus([UNOVA1_CHAMPION.id]).find((entry) => entry.id === 'unova2-cheren').desbloqueado, true);
  assert.equal(challengesWithStatus([...UNOVA1_GYMS, UNOVA1_CHAMPION, ...UNOVA2_GYMS, ...UNOVA2_ELITE].map((entry) => entry.id)).find((entry) => entry.id === UNOVA2_CHAMPION.id).desbloqueado, true);
  assert.equal(wildLevelCap([], 'johto'), 10);
  assert.equal(wildLevelCap([...JOHTO_GYMS, ...JOHTO_ELITE, JOHTO_CHAMPION].map((entry) => entry.id), 'johto'), 100);
  assert.equal(wildLevelCap([...HOENN_GYMS, ...HOENN_ELITE, HOENN_CHAMPION].map((entry) => entry.id), 'hoenn'), 100);
  assert.equal(wildLevelCap([...SINNOH_GYMS, ...SINNOH_ELITE, SINNOH_CHAMPION].map((entry) => entry.id), 'sinnoh'), 100);
  assert.equal(wildLevelCap([...UNOVA1_GYMS, ...UNOVA1_ELITE, UNOVA1_CHAMPION].map((entry) => entry.id), 'unova1'), 100);
});

test('Kalos, Alola, Galar e Paldea têm desafios e encontros desbloqueados em sequência', () => {
  const catalog = getCatalogo();
  const borders = [['kalos', 650, 721], ['alola', 722, 809], ['galar', 810, 905], ['paldea', 906, 1025]];
  for (const [id, first, last] of borders) {
    const region = REGIONS.find((entry) => entry.id === id);
    assert.equal(region.gyms.length, 8);
    assert.equal(region.elite.length, 4);
    assert.equal(region.champion.pokemon.length, 6);
    assert.equal(regionUnlocked(id, []), false);
    for (const leader of [...region.gyms, ...region.elite, region.champion]) assert.ok(leader.pokemon.every((number) => number >= 1 && number <= 1025));
    const prerequisite = id === 'kalos' ? [UNOVA1_CHAMPION.id, UNOVA2_CHAMPION.id] : id === 'alola' ? KALOS_GYMS.map((entry) => entry.id) : id === 'galar' ? ALOLA_TRIALS.map((entry) => entry.id) : GALAR_GYMS.map((entry) => entry.id);
    assert.equal(regionUnlocked(id, prerequisite.slice(0, -1)), false);
    assert.equal(regionUnlocked(id, prerequisite), true);
    assert.equal(rollWild(catalog, () => 0, prerequisite, id).id, first);
    const finalEncounter = rollWild(catalog, (total) => total - 1, prerequisite, id);
    assert.equal(finalEncounter.id, catalog.pokemon.filter((species) => species.id >= first && species.id <= last && legendaryUnlocked(species, prerequisite)).at(-1).id);
    assert.equal(rollWild(catalog, (total) => total - 1, [...prerequisite, ...region.elite.map((leader) => leader.id)], id).id, last);
    assert.equal(challengesWithStatus(prerequisite).find((entry) => entry.id === region.gyms[0].id).desbloqueado, true);
    assert.equal(challengesWithStatus([...prerequisite, ...region.gyms.map((entry) => entry.id)]).find((entry) => entry.id === region.elite[0].id).desbloqueado, true);
    assert.equal(wildLevelCap([region.champion.id], id), 100);
    assert.equal(shinyRolls([...region.gyms, ...region.elite, region.champion].map((entry) => entry.id), region.geracao, true), 11);
  }
  assert.equal(regionUnlocked('kalos', [UNOVA1_CHAMPION.id]), false);
  assert.equal(regionUnlocked('kalos', [UNOVA2_CHAMPION.id]), false);
  assert.equal(REGIONS.find((entry) => entry.id === 'alola').challengeLabel, 'Provas Insulares');
  assert.equal(REGIONS.find((entry) => entry.id === 'galar').eliteLabel, 'Copa dos Campeões');
  for (const id of [KALOS_CHAMPION.id, ALOLA_CHAMPION.id, GALAR_CHAMPION.id, PALDEA_CHAMPION.id]) assert.ok(challengesWithStatus([]).find((entry) => entry.id === id));
});

test('lendários e míticos selvagens exigem a Elite da própria geração; treinadores usam todas as gerações', () => {
  const catalog = getCatalogo();
  for (const region of REGIONS) {
    const special = catalog.pokemon.find((species) => species.id >= region.minSpecies && species.id <= region.maxSpecies && (species.lendario || species.mitico));
    assert.ok(special, `Sem lendário ou mítico em ${region.id}`);
    assert.equal(legendaryUnlocked(special, []), false);
    assert.equal(legendaryUnlocked(special, region.elite.slice(0, -1).map((leader) => leader.id)), false);
    const completed = region.elite.map((leader) => leader.id);
    assert.equal(legendaryUnlocked(special, completed), true);
    const oneSpecies = { pokemon: [special] };
    assert.equal(rollWild(oneSpecies, () => 0, [], 'todas'), null);
    if (regionUnlocked(region.id, completed)) assert.equal(rollWild(oneSpecies, () => 0, completed, region.id).id, special.id);
  }
  assert.equal(legendaryUnlocked(catalog.pokemon.find((species) => species.id === 150), REGIONS.find((region) => region.id === 'johto').elite.map((leader) => leader.id)), false);
  assert.ok(rollTrainer('facil', catalog, (max) => max - 1).pokemon.some((entry) => entry.id > 151));
  assert.ok(rollTrainer('dificil', catalog, (max) => max - 1).pokemon.some((entry) => entry.id > 905));
  assert.ok(rollTournament('copa-prime', (max) => max - 1).treinadores[0].pokemon.some((entry) => entry.id > 905));
});

test('Charms seguem os marcos de Kanto e não afetam outra geração', () => {
  assert.equal(GYMS.at(-1).id, 'giovanni');
  assert.equal(ELITE[0].nivel, 65);
  for (let gyms = 0; gyms <= 8; gyms++) {
    const completed = GYMS.slice(0, gyms).map((entry) => entry.id);
    assert.equal(shinyRolls(completed, 1, true), 1 + Math.max(0, gyms - 3));
  }
  const completed = [...GYMS, ...ELITE, CHAMPION].map((entry) => entry.id);
  assert.equal(charmMilestones(completed), 10);
  assert.equal(shinyRolls(completed, 1, true), 11);
  assert.equal(catchCharmMultiplier(completed, 1, true), 1.3);
  assert.equal(shinyRolls(completed, 2, true), 1);
  assert.equal(catchCharmMultiplier(completed, 2, true), 1);
  assert.equal(shinyRolls(completed, 1, false), 1);
  let attempts = 0;
  assert.equal(rollShiny((max) => { assert.equal(max, 4096); return ++attempts === 3 ? 0 : 1; }, 3), true);
  assert.equal(attempts, 3);
});

test('Charms de Hoenn dependem apenas dos desafios de Hoenn', () => {
  const johto = [...JOHTO_GYMS, ...JOHTO_ELITE, JOHTO_CHAMPION].map((entry) => entry.id);
  assert.equal(charmMilestones(johto, 3), 0);
  const hoenn = [...HOENN_GYMS, ...HOENN_ELITE, HOENN_CHAMPION].map((entry) => entry.id);
  assert.equal(charmMilestones(hoenn, 3), 10);
  assert.equal(shinyRolls(hoenn, 3, true), 11);
  assert.equal(catchCharmMultiplier(hoenn, 3, true), 1.3);
});

test('treinadores respeitam equipes, níveis e recompensas; efetividade considera os dois tipos', () => {
  for (const [difficulty, rules] of Object.entries(TRAINER_DIFFICULTIES)) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const trainer = rollTrainer(difficulty);
      assert.ok(trainer.pokemon.length >= rules.minimo && trainer.pokemon.length <= rules.maximo);
      assert.ok(trainer.pokemon.every((entry) => entry.nivel >= rules.nivelMinimo && entry.nivel <= rules.nivelMaximo));
      assert.equal(new Set(trainer.pokemon.map((entry) => entry.id)).size, trainer.pokemon.length);
      assert.equal(trainer.recompensa.moedas, rules.moedas);
      assert.ok(trainer.recompensa.itens.every((item) => item.itemId !== 'master-ball'));
    }
  }
  assert.equal(effectiveness('electric', ['water', 'flying']), 4);
  assert.equal(effectiveness('water', ['water', 'dragon']), .25);
  assert.equal(effectiveness('normal', ['ghost']), 0);
  assert.equal(effectiveness('fire', ['grass']), 2);
  assert.equal(effectiveness('fire', ['normal']), 1);
});

test('torneios geram oito equipes e prêmios dentro de cada faixa', () => {
  assert.equal(TOURNAMENTS.length, 6);
  for (const rule of TOURNAMENTS) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const tournament = rollTournament(rule.id);
      assert.equal(tournament.treinadores.length, 8);
      assert.equal(tournament.entrada, rule.entrada);
      assert.equal(tournament.recompensa.moedas, rule.moedas);
      for (const trainer of tournament.treinadores) {
        assert.ok(trainer.pokemon.length >= rule.minimo && trainer.pokemon.length <= rule.maximo);
        assert.equal(new Set(trainer.pokemon.map((entry) => entry.id)).size, trainer.pokemon.length);
        assert.ok(trainer.pokemon.every((entry) => entry.nivel >= rule.nivelMinimo && entry.nivel <= rule.nivelMaximo));
        if (rule.id === 'muito-facil') assert.ok(trainer.pokemon.every(({ id }) => wildWeight(getCatalogo().pokemon[id - 1]) === 120));
        if (rule.id === 'dificil') assert.ok(trainer.pokemon.every(({ id }) => Object.values(getCatalogo().pokemon[id - 1].atributosBase).reduce((sum, stat) => sum + stat, 0) >= 460 || wildWeight(getCatalogo().pokemon[id - 1]) === 5));
      }
      for (const [itemId, min, max] of rule.premios) {
        const quantity = tournament.recompensa.itens.find((entry) => entry.itemId === itemId)?.quantidade ?? 0;
        assert.ok(quantity >= min && quantity <= max);
      }
    }
  }
  assert.equal(rollTournament('inexistente'), null);
});

test('itens de cura respeitam HP atual e estado de desmaio', () => {
  const pokemon = { hp: 25, maxHp: 100 };
  assert.equal(healCombatant(pokemon, 'potion'), 20);
  assert.equal(pokemon.hp, 45);
  assert.equal(healCombatant(pokemon, 'max-potion'), 55);
  assert.equal(healCombatant(pokemon, 'potion'), null);
  pokemon.hp = 0;
  assert.equal(healCombatant(pokemon, 'potion'), null);
  assert.equal(healCombatant(pokemon, 'revive'), 50);
});

test('golpes ofensivos respeitam aprendizado por nivel e shiny ganha 20% de cada atributo', () => {
  for (const species of getCatalogo().pokemon) {
    for (const level of [5, 20, 50, 100]) {
      const moves = levelMovesFor(species, level);
      assert.ok(moves.length >= 1 && moves.length <= 4);
      assert.equal(new Set(moves.map((move) => move.nome)).size, moves.length);
      assert.ok(moves.every((move) => move.poder > 0 && ['physical', 'special'].includes(move.categoria)));
      assert.ok(moves.every((move) => move.nome === 'struggle' || species.golpesAprendidos.some((entry) => entry.golpe === move.nome && entry.metodo === 'level-up' && entry.nivel <= level)));
    }
    const normal = statsFor(species, 50);
    const shiny = statsFor(species, 50, true);
    for (const key of Object.keys(normal)) assert.equal(shiny[key], Math.floor(normal[key] * 1.2));
  }
  assert.deepEqual(levelMovesFor(getCatalogo().pokemon[3], 5).map((move) => move.nome), ['scratch']);
  assert.deepEqual(levelMovesFor(getCatalogo().pokemon[3], 7).map((move) => move.nome), ['ember', 'scratch']);
  const mega = formFor(getCatalogo().pokemon[5], 'charizard-mega-x');
  assert.equal(mega.tipos[1], 'dragon');
  assert.ok(statsFor(mega, 60).attack > statsFor(getCatalogo().pokemon[5], 60).attack);
  const attacker = { nivel: 50, tipos: ['electric'], stats: statsFor(getCatalogo().pokemon[24], 50) };
  const defender = { nivel: 50, tipos: ['water'], stats: statsFor(getCatalogo().pokemon[6], 50) };
  const move = getCatalogo().golpes.find((entry) => entry.nome === 'thunderbolt');
  assert.ok(damage(attacker, defender, move, () => 1).dano > 0);
});

test('evolucoes por nivel, pedra, cabo e Mega Pedra validam requisitos', () => {
  assert.equal(evolutionOptions({ especieId: 1, nivel: 15 })[0].disponivel, false);
  assert.equal(evolutionOptions({ especieId: 1, nivel: 16 })[0].disponivel, true);
  assert.equal(evolutionOptions({ especieId: 25, nivel: 20 })[0].itemId, 'thunder-stone');
  assert.equal(evolutionOptions({ especieId: 25, nivel: 20 }, [{ itemId: 'thunder-stone', quantidade: 1 }])[0].disponivel, true);
  assert.equal(evolutionOptions({ especieId: 64, nivel: 20 }, [{ itemId: 'linking-cord', quantidade: 1 }])[0].disponivel, true);
  assert.equal(evolutionOptions({ especieId: 315, nivel: 30 }, [{ itemId: 'shiny-stone', quantidade: 1 }])[0].alvo, 407);
  assert.equal(evolutionOptions({ especieId: 315, nivel: 30 }, [{ itemId: 'shiny-stone', quantidade: 1 }])[0].disponivel, true);
  assert.equal(evolutionOptions({ especieId: 190, nivel: 35 })[0].disponivel, false);
  assert.equal(evolutionOptions({ especieId: 190, nivel: 35, golpes: [{ nome: 'double-hit' }] })[0].disponivel, true);
  const charizard = evolutionOptions({ especieId: 6, nivel: 60 }, [{ itemId: 'charizardite-x', quantidade: 1 }]);
  assert.equal(charizard.find((entry) => entry.alvo === 'charizard-mega-x').disponivel, true);
  assert.equal(charizard.find((entry) => entry.alvo === 'charizard-mega-y').disponivel, false);
  const gmax = evolutionOptions({ especieId: 6, nivel: 20 }, [{ itemId: 'gmax-stone', quantidade: 1 }]);
  assert.equal(gmax.find((entry) => entry.alvo === 'charizard-gmax').disponivel, true);
  assert.equal(evolutionOptions({ especieId: 6, nivel: 80, gmaxForma: 'charizard-gmax' }).length, 0);
  assert.ok(statsFor(formFor(getCatalogo().pokemon[5], null, 'charizard-gmax'), 50).hp > statsFor(getCatalogo().pokemon[5], 50).hp);
  const groudon = evolutionOptions({ especieId: 383, nivel: 60 }, [{ itemId: 'red-orb', quantidade: 1 }]);
  assert.equal(groudon.find((entry) => entry.alvo === 'groudon-primal').disponivel, true);
  assert.equal(formFor(getCatalogo().pokemon[382], 'groudon-primal').tipos.includes('fire'), true);
  assert.equal(evolutionOptions({ especieId: 382, nivel: 60 }, [{ itemId: 'blue-orb', quantidade: 1 }]).find((entry) => entry.alvo === 'kyogre-primal').disponivel, true);
});

test('Eevee usa exclusivamente a pedra definida para cada evolução especial', () => {
  const stones = new Map([[196, 'shiny-stone'], [197, 'dusk-stone'], [470, 'leaf-stone'], [471, 'ice-stone'], [700, 'dawn-stone']]);
  for (const [target, stone] of stones) {
    const option = evolutionOptions({ especieId: 133, nivel: 5 }, [{ itemId: stone, quantidade: 1 }]).find((entry) => entry.alvo === target);
    assert.equal(option.itemId, stone);
    assert.equal(option.disponivel, true);
    assert.equal(evolutionOptions({ especieId: 133, nivel: 100 }, []).find((entry) => entry.alvo === target).disponivel, false);
    for (const [otherTarget, otherStone] of stones) {
      if (otherTarget === target) continue;
      assert.equal(evolutionOptions({ especieId: 133, nivel: 100 }, [{ itemId: otherStone, quantidade: 1 }]).find((entry) => entry.alvo === target).disponivel, false);
    }
    for (const pokemon of getCatalogo().pokemon.filter((entry) => entry.evolucao.especieId === 133)) {
      assert.deepEqual(pokemon.evolucao.evolucoes.find((entry) => entry.especieId === target).condicoes, [{ gatilho: 'use-item', item: stone }]);
    }
  }
});

test('MySQL: inicia encontro, persiste rodadas, consome bola, foge e preserva colecao', { skip: process.env.TEST_MYSQL !== '1' }, async () => {
  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();
  const app = createApp({ db, config: parseEnv(process.env) });
  const login = `battle_${randomUUID().replaceAll('-', '').slice(0, 19)}`;
  let userId;
  let checkpoint = 'registro';
  try {
    const account = await request(app).post('/api/auth/register').send({ login, senha: 'Battle-test-145!', nomeTreinador: 'Teste Batalha' }).expect(201);
    userId = account.body.data.usuario.id;
    checkpoint = 'novo save';
    const auth = { Authorization: `Bearer ${account.body.data.token}` };
    const oldSave = await request(app).get('/api/jogador/save').set(auth).expect(200);
    const save = await request(app).post('/api/jogador/save').set(auth).send({ nomeTreinador: 'Teste Batalha', substituirSaveId: oldSave.body.data.id }).expect(201);
    await request(app).post('/api/jogador/inicial').set(auth).send({ saveId: save.body.data.id, especieId: 1 }).expect(201);
    const member = (await request(app).get('/api/jogador/pokemon').set(auth).expect(200)).body.data[0];
    checkpoint = 'desafios';
    const challenge = await request(app).get('/api/batalhas/desafios').set(auth).expect(200);
    assert.equal(challenge.body.data.nivelMaximoSelvagem, 10);
    await request(app).post('/api/batalhas/iniciar').set(auth).send({ tipo: 'desafio', desafioId: 'lorelei' }).expect(403);
    const started = await request(app).post('/api/batalhas/iniciar').set(auth).send({ tipo: 'selvagem' }).expect(201);
    checkpoint = 'acoes';
    const battle = started.body.data;
    assert.equal(battle.jogador, null);
    assert.ok(battle.oponente.especieId);
    assert.equal((await db.batalha.findUnique({ where: { saveId: save.body.data.id } })).id, battle.id);
    assert.equal((await request(app).get('/api/jogador/inventario').set(auth).expect(200)).body.data.find((item) => item.itemId === 'poke-ball').quantidade, 10);
    const searched = await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: battle.id, versao: 0, acao: 'procurar' }).expect(200);
    assert.equal(searched.body.data.jogador, null);
    assert.equal(searched.body.data.rodada, 1);
    assert.notEqual(searched.body.data.oponente.especieId, battle.oponente.especieId);
    const chosen = await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: battle.id, versao: 1, acao: 'escolher', pokemonId: member.id }).expect(200);
    assert.equal(chosen.body.data.jogador.ataques[0].nome, 'tackle');
    assert.equal(chosen.body.data.rodada, 1);
    await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: battle.id, versao: 1, acao: 'fugir' }).expect(409);
    const result = await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: battle.id, versao: 2, acao: 'fugir' }).expect(200);
    assert.equal(result.body.data.resultado, 'fuga');
    assert.equal((await request(app).get('/api/batalhas/atual').set(auth).expect(200)).body.data, null);
    const skipped = await request(app).post('/api/batalhas/iniciar').set(auth).send({ tipo: 'selvagem' }).expect(201);
    const skippedResult = await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: skipped.body.data.id, versao: 0, acao: 'fugir' }).expect(200);
    assert.equal(skippedResult.body.data.resultado, 'fuga');
    const second = await request(app).post('/api/batalhas/iniciar').set(auth).send({ tipo: 'selvagem' }).expect(201);
    await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: second.body.data.id, versao: 0, acao: 'escolher', pokemonId: member.id }).expect(200);
    const caughtOrEscaped = await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: second.body.data.id, versao: 1, acao: 'capturar', itemId: 'poke-ball' }).expect(200);
    assert.ok(['captura', null, 'derrota'].includes(caughtOrEscaped.body.data.resultado));
    assert.equal((await request(app).get('/api/jogador/inventario').set(auth).expect(200)).body.data.find((item) => item.itemId === 'poke-ball').quantidade, 9);
    if (!caughtOrEscaped.body.data.resultado) await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: second.body.data.id, versao: 2, acao: 'fugir' }).expect(200);
    assert.ok((await request(app).get('/api/jogador/pokemon').set(auth).expect(200)).body.data.length >= 1);
    await db.itemInventario.create({ data: { saveId: save.body.data.id, itemId: 'master-ball', quantidade: 2 } });
    for (let index = 0; index < 2; index++) {
      const encounter = await request(app).post('/api/batalhas/iniciar').set(auth).send({ tipo: 'selvagem' }).expect(201);
      await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: encounter.body.data.id, versao: 0, acao: 'escolher', pokemonId: member.id }).expect(200);
      const captured = await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: encounter.body.data.id, versao: 1, acao: 'capturar', itemId: 'master-ball' }).expect(200);
      assert.equal(captured.body.data.resultado, 'captura');
      assert.ok(captured.body.data.xpGanho > 0);
    }
    assert.ok((await request(app).get('/api/jogador/pokemon').set(auth).expect(200)).body.data.length >= 3);
    const history = (await request(app).get('/api/jogador/historico').set(auth).expect(200)).body.data;
    assert.ok(history.resumo.capturas >= 2);
    assert.ok(history.eventos.some((entry) => entry.tipo === 'capturar'));
    await db.pokemonCapturado.update({ where: { id: member.id }, data: { nivel: 16, experiencia: getCatalogo().pokemon[0].experienciaPorNivel.find((entry) => entry.nivel === 16).experiencia } });
    const evolution = await request(app).get(`/api/jogador/pokemon/${member.id}/evolucoes`).set(auth).expect(200);
    assert.equal(evolution.body.data.find((entry) => entry.alvo === 2).disponivel, true);
    const ivysaur = await request(app).post(`/api/jogador/pokemon/${member.id}/evoluir`).set(auth).send({ alvo: 2 }).expect(200);
    assert.equal(ivysaur.body.data.especieId, 2);
    assert.ok((await request(app).get('/api/jogador/pokedex').set(auth).expect(200)).body.data.includes(1));
    await db.pokemonCapturado.update({ where: { id: member.id }, data: { nivel: 60, experiencia: getCatalogo().pokemon[1].experienciaPorNivel.find((entry) => entry.nivel === 60).experiencia } });
    const venusaur = await request(app).post(`/api/jogador/pokemon/${member.id}/evoluir`).set(auth).send({ alvo: 3 }).expect(200);
    assert.equal(venusaur.body.data.especieId, 3);
    await db.save.update({ where: { id: save.body.data.id }, data: { moedas: 50000 } });
    await request(app).post('/api/jogador/itens/comprar').set(auth).send({ itemId: 'venusaurite' }).expect(200);
    const mega = await request(app).post(`/api/jogador/pokemon/${member.id}/evoluir`).set(auth).send({ alvo: 'venusaur-mega' }).expect(200);
    assert.equal(mega.body.data.megaForma, 'venusaur-mega');
    assert.equal((await request(app).get('/api/jogador/inventario').set(auth).expect(200)).body.data.find((item) => item.itemId === 'venusaurite'), undefined);
    const gym = await request(app).post('/api/batalhas/iniciar').set(auth).send({ tipo: 'desafio', desafioId: 'brock' }).expect(201);
    const gymChosen = await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: gym.body.data.id, versao: 0, acao: 'escolher', pokemonId: member.id }).expect(200);
    assert.equal(gymChosen.body.data.jogador.nivel, 15);
    assert.equal(gymChosen.body.data.jogador.megaForma, 'venusaur-mega');
    assert.equal(gym.body.data.oponente.nivel, 15);
    await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: gym.body.data.id, versao: 1, acao: 'capturar', itemId: 'poke-ball' }).expect(400);
    const gymTurn = await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: gym.body.data.id, versao: 1, acao: 'ataque', golpe: gymChosen.body.data.jogador.ataques[0].nome }).expect(200);
    assert.equal(gymTurn.body.data.rodada, 2);
    assert.ok(gymTurn.body.data.logs.some((entry) => entry.includes('causou') || entry.includes('errou')));
  } catch (error) {
    console.error('Falha de integracao no passo:', checkpoint);
    throw error;
  } finally {
    if (userId) {
      const currentSave = await db.save.findUnique({ where: { usuarioId: userId } });
      if (currentSave) {
        for (const model of ['batalha', 'desafioConcluido', 'especieRegistrada', 'pokemonCapturado', 'itemInventario']) await db[model].deleteMany({ where: { saveId: currentSave.id } });
        await db.save.delete({ where: { id: currentSave.id } });
      }
      await db.usuario.delete({ where: { id: userId } });
    }
    await db.$disconnect();
  }
});
