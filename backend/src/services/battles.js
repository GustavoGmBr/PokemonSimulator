import { randomInt } from 'node:crypto';
import { HttpError } from '../lib/errors.js';
import { getCatalogo, getEspecie } from './catalogo.js';
import { REGIONS, regionUnlocked, legendaryUnlocked, catchCharmMultiplier, challengesWithStatus, charmMilestones, damage, effectiveness, formFor, levelMovesFor, makeCombatant, rollShiny, rollWild, rollTrainer, shinyRolls, statsFor, wildLevelCap } from './battleRules.js';
import { generationForSpecies, HEALING_ITEMS, healCombatant } from './itemRules.js';
import { equippedMoves, naturalMoves, unlockedMoves } from './moveRules.js';
import { TOURNAMENTS, rollTournament } from './tournaments.js';

const CAPTURE_MULTIPLIER = { 'poke-ball': 1, 'great-ball': 1.5, 'ultra-ball': 2, 'master-ball': Infinity };
function displayName(name) { return name.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }

export function createBattleService(db) {
  async function movesFor(tx, speciesId, level) {
    const names = levelMovesFor(getEspecie(speciesId), level).map((move) => move.nome);
    const rows = await tx.especieAtaque.findMany({ where: { especieId: speciesId, nivelAprendido: { lte: level } }, include: { golpe: true } });
    const byName = new Map(rows.map((row) => [row.golpe.nome, row.golpe]));
    if (names.includes('struggle')) byName.set('struggle', await tx.golpeBatalha.findUnique({ where: { nome: 'struggle' } }));
    if (names.some((name) => !byName.get(name))) throw new HttpError(503, 'Golpes de batalha nao preparados. Execute npm run catalog:seed-moves.');
    return names.map((name) => { const move = byName.get(name); return { nome: move.nome, tipo: move.tipo, categoria: move.categoria, poder: move.poder, precisao: move.precisao, prioridade: move.prioridade }; });
  }
  async function playerMovesFor(tx, member) {
    const names = equippedMoves(member, getEspecie(member.especieId));
    const rows = await tx.golpeBatalha.findMany({ where: { nome: { in: names } } });
    const byName = new Map(rows.map((move) => [move.nome, move]));
    if (names.some((name) => !byName.has(name))) throw new HttpError(503, 'Golpes de batalha não preparados. Execute npm run catalog:seed-moves.');
    return names.map((name) => byName.get(name));
  }
  async function progress(tx, saveId) {
    return (await tx.desafioConcluido.findMany({ where: { saveId }, select: { desafioId: true } })).map((entry) => entry.desafioId);
  }
  function log(state, message) { state.logs = [...state.logs.slice(-24), message]; }
  function attack(state, attacker, defender, move) {
    const result = damage(attacker, defender, move);
    if (!result.acerto) { log(state, `${attacker.nome} usou ${displayName(move.nome)}, mas errou.`); return; }
    defender.hp = Math.max(0, defender.hp - result.dano);
    log(state, `${attacker.nome} usou ${displayName(move.nome)} e causou ${result.dano} de dano.${result.critico ? ' Acerto crítico!' : ''}${result.efetividade > 1 ? ' Super eficaz!' : result.efetividade < 1 ? ' Pouco eficaz.' : ''}`);
  }
  function aiMove(enemy, player) {
    const best = enemy.ataques.map((move) => ({ move, score: move.poder * (enemy.tipos.includes(move.tipo) ? 1.5 : 1) * effectiveness(move.tipo, player.tipos) * (move.precisao ?? 100) / 100 }));
    best.sort((a, b) => b.score - a.score);
    return best[Math.min(randomInt(Math.min(2, best.length)), best.length - 1)].move;
  }
  function opponentTurn(state) {
    const move = aiMove(state.oponente, state.jogador);
    attack(state, state.oponente, state.jogador, move);
    if (state.jogador.hp === 0) { state.aguardandoReviver = true; log(state, `${state.jogador.nome} desmaiou. ${state.reservas?.length ? 'Escolha outro Pokémon ou use um Reviver.' : 'Use um Reviver ou aceite a derrota.'}`); }
  }
  function afterFaint(state) {
    const fallen = state.oponente;
    const base = getEspecie(fallen.especieId).experienciaBase ?? 50;
    const earned = Math.max(1, Math.floor(base * fallen.nivel / 7 * (state.tipo === 'desafio' ? 1.5 : 1)));
    state.xpGanho += earned;
    state.xpPorPokemon[state.jogador.pokemonId] = (state.xpPorPokemon[state.jogador.pokemonId] ?? 0) + earned;
    if (state.tipo !== 'torneio') state.moedasGanhas = (state.moedasGanhas ?? 0) + fallen.nivel * 10;
    if (state.fila.length) {
      state.oponente = state.fila.shift();
      log(state, `${state.oponente.nome} entrou em batalha.`);
    } else if (state.tipo === 'torneio' && state.torneio.rodada < 8) {
      state.torneio.rodada++;
      state.jogador = null;
      state.reservas = [];
      state.aguardandoReviver = false;
      log(state, `Rodada ${state.torneio.rodada - 1} vencida! Seu Pokémon recuperou o HP. Escolha quem enfrentará o próximo treinador.`);
    } else { state.resultado = 'vitoria'; log(state, state.tipo === 'torneio' ? 'Você venceu o torneio!' : 'Você venceu a batalha!'); }
  }
  async function recordWildDefeat(tx, saveId, state) {
    if (state.tipo !== 'selvagem') return;
    await tx.batalhaEvento.create({ data: { saveId, tipo: 'derrotar', especieId: state.oponente.especieId, regiao: state.regiaoEncontro, shiny: state.oponente.shiny, descricao: `${state.oponente.nome} selvagem derrotado` } });
  }
  async function loadTournamentRound(tx, state) {
    const trainer = state.torneio.treinadores[state.torneio.rodada - 1];
    const opponents = [];
    for (const { id, nivel } of trainer.pokemon) opponents.push(makeCombatant(id, nivel, false, await movesFor(tx, id, nivel)));
    state.treinador = trainer.nome;
    state.totalOponentes = opponents.length;
    state.oponente = opponents.shift();
    state.fila = opponents;
    log(state, `${trainer.nome} desafiou você! ${state.oponente.nome} entrou em batalha.`);
  }
  async function finish(tx, save, state, action) {
    const inventory = await tx.itemInventario.findMany({ where: { saveId: save.id, quantidade: { gt: 0 } }, select: { itemId: true } });
    const owned = new Set(inventory.map((entry) => entry.itemId));
    if (state.resultado === 'vitoria') {
      state.moedasGanhas = (['treinador', 'torneio'].includes(state.tipo) ? state.recompensa.moedas : state.moedasGanhas ?? state.oponente.nivel * 10) * (owned.has('amulet-coin') ? 2 : 1);
      await tx.save.update({ where: { id: save.id }, data: { vitorias: { increment: 1 }, moedas: { increment: state.moedasGanhas } } });
      if (state.tipo === 'desafio') await tx.desafioConcluido.upsert({ where: { saveId_desafioId: { saveId: save.id, desafioId: state.desafioId } }, create: { saveId: save.id, desafioId: state.desafioId }, update: {} });
      if (['treinador', 'torneio'].includes(state.tipo)) {
        state.itensGanhos = state.recompensa.itens;
        for (const item of state.itensGanhos) await tx.itemInventario.upsert({ where: { saveId_itemId: { saveId: save.id, itemId: item.itemId } }, create: { saveId: save.id, ...item }, update: { quantidade: { increment: item.quantidade } } });
      }
    } else if (state.resultado === 'derrota') await tx.save.update({ where: { id: save.id }, data: { derrotas: { increment: 1 } } });
    if (state.resultado === 'captura') {
      const foe = state.oponente;
      state.xpGanho += Math.max(1, Math.floor((getEspecie(foe.especieId).experienciaBase ?? 50) * foe.nivel / 7));
      await tx.pokemonCapturado.create({ data: { saveId: save.id, especieId: foe.especieId, nivel: foe.nivel, experiencia: getEspecie(foe.especieId).experienciaPorNivel.find((entry) => entry.nivel === foe.nivel).experiencia, hpAtual: foe.maxHp, shiny: foe.shiny, bolaCaptura: action.itemId, atributos: foe.stats, golpes: foe.ataques.map((move) => ({ nome: move.nome })), golpesDesbloqueados: naturalMoves(getEspecie(foe.especieId), foe.nivel) } });
      await tx.especieRegistrada.upsert({ where: { saveId_especieId: { saveId: save.id, especieId: foe.especieId } }, create: { saveId: save.id, especieId: foe.especieId }, update: {} });
      await tx.batalhaEvento.create({ data: { saveId: save.id, tipo: 'capturar', especieId: foe.especieId, regiao: state.regiaoEncontro, shiny: foe.shiny, descricao: `${foe.nome}${foe.shiny ? ' shiny' : ''} capturado` } });
    }
    if (state.resultado === 'vitoria' && state.tipo === 'treinador') await tx.batalhaEvento.create({ data: { saveId: save.id, tipo: 'vencer_treinador', dificuldade: state.dificuldade, descricao: `${state.treinador} derrotado no modo ${state.dificuldade}` } });
    if (state.resultado === 'vitoria' && state.tipo === 'torneio') await tx.batalhaEvento.create({ data: { saveId: save.id, tipo: 'vencer_torneio', torneioId: state.torneio.id, descricao: `Torneio ${state.torneio.nome} vencido` } });
    await tx.batalhaEvento.create({ data: { saveId: save.id, tipo: 'batalha', especieId: state.oponente.especieId, regiao: state.regiaoEncontro ?? state.regiao, dificuldade: state.dificuldade, torneioId: state.torneio?.id, resultado: state.resultado, shiny: state.oponente.shiny, descricao: `${state.tipo === 'selvagem' ? state.oponente.nome : state.treinador ?? 'Batalha'} · ${state.resultado}` } });
    if (state.resultado === 'captura' && state.jogador) state.xpPorPokemon[state.jogador.pokemonId] = (state.xpPorPokemon[state.jogador.pokemonId] ?? 0) + state.xpGanho;
    const xpEntries = Object.entries(state.xpPorPokemon ?? {});
    if (owned.has('lucky-egg')) state.xpGanho *= 2;
    for (const [pokemonId, baseXp] of xpEntries) {
      const member = await tx.pokemonCapturado.findFirst({ where: { id: pokemonId, saveId: save.id } });
      if (!member) continue;
      const earnedXp = owned.has('lucky-egg') ? baseXp * 2 : baseXp;
      const species = getEspecie(member.especieId);
      const maxXp = species.experienciaPorNivel.at(-1).experiencia;
      const experience = Math.min(maxXp, member.experiencia + earnedXp);
      const level = [...species.experienciaPorNivel].reverse().find((entry) => entry.experiencia <= experience)?.nivel ?? member.nivel;
      const stats = statsFor(formFor(species, member.megaForma, member.gmaxForma), level, member.shiny);
      await tx.pokemonCapturado.update({ where: { id: member.id }, data: { experiencia: experience, nivel: level, atributos: stats, hpAtual: stats.hp, golpesDesbloqueados: [...new Set([...unlockedMoves(member, species), ...naturalMoves(species, level)])] } });
      if (state.jogador?.pokemonId === member.id) state.novoNivel = level;
    }
    await tx.batalha.delete({ where: { id: action.batalhaId } });
    return { id: action.batalhaId, versao: action.versao + 1, ...state };
  }
  return {
    async challenges(usuarioId) {
      const save = await db.save.findUnique({ where: { usuarioId } });
      if (!save) throw new HttpError(404, 'Save nao encontrado.');
      const beaten = await progress(db, save.id);
      return { lideres: challengesWithStatus(beaten), torneios: TOURNAMENTS,
        regioes: REGIONS.map((region) => ({ id: region.id, nome: region.nome, geracao: region.geracao, especieInicial: region.minSpecies, especieFinal: region.maxSpecies, campeaoId: region.champion.id, challengeLabel: region.challengeLabel ?? 'Ginásios', eliteLabel: region.eliteLabel ?? 'Elite dos 4',
          desbloqueada: regionUnlocked(region.id, beaten), concluida: beaten.includes(region.champion.id), escolhaSelvagem: beaten.includes(region.champion.id), nivelMaximoSelvagem: wildLevelCap(beaten, region.id), marcosCharm: charmMilestones(beaten, region.geracao) })),
        nivelMaximoSelvagem: wildLevelCap(beaten), marcosCharm: charmMilestones(beaten),
        geracoesDesbloqueadas: [...new Set(REGIONS.filter((region) => regionUnlocked(region.id, beaten)).map((region) => region.geracao))], geracoesImplementadas: [...new Set(REGIONS.map((region) => region.geracao))] };
    },
    async current(usuarioId) {
      const save = await db.save.findUnique({ where: { usuarioId } });
      if (!save) return null;
      const active = await db.batalha.findUnique({ where: { saveId: save.id } });
      return active ? { id: active.id, versao: active.versao, ...active.estado } : null;
    },
    async start(usuarioId, { tipo, desafioId, dificuldade, torneioId, regiao, selvagem }) {
      return db.$transaction(async (tx) => {
        const save = await tx.save.findUnique({ where: { usuarioId } });
        if (!save?.inicialEspecieId) throw new HttpError(409, 'Escolha seu inicial antes de batalhar.');
        if (await tx.batalha.findUnique({ where: { saveId: save.id } })) throw new HttpError(409, 'Uma batalha ja esta em andamento.');
        const completed = await progress(tx, save.id);
        const inventory = await tx.itemInventario.findMany({ where: { saveId: save.id, quantidade: { gt: 0 } }, select: { itemId: true } });
        const owned = new Set(inventory.map((entry) => entry.itemId));
        const leader = tipo === 'desafio' ? challengesWithStatus(completed).find((entry) => entry.id === desafioId) : null;
        if (tipo === 'desafio' && !leader) throw new HttpError(404, 'Lider nao encontrado.');
        if (leader && !leader.desbloqueado) throw new HttpError(403, 'Desafio ainda bloqueado.');
        const requestedRegion = regiao ?? selvagem?.regiao ?? 'kanto';
        const wildRegion = REGIONS.find((entry) => entry.id === requestedRegion);
        if (tipo === 'selvagem' && (requestedRegion !== 'todas' && (!wildRegion || !regionUnlocked(wildRegion.id, completed)) || requestedRegion === 'todas' && selvagem)) throw new HttpError(403, 'Região ainda bloqueada ou escolha personalizada indisponível para todas as gerações.');
        if (selvagem && !completed.includes(wildRegion.champion.id)) throw new HttpError(403, `Derrote o campeão de ${wildRegion.nome} para escolher espécie e nível selvagem.`);
        if (selvagem && (selvagem.regiao !== wildRegion.id || selvagem.especieId < wildRegion.minSpecies || selvagem.especieId > wildRegion.maxSpecies)) throw new HttpError(404, 'Espécie indisponível nesta região.');
        const trainer = tipo === 'treinador' ? rollTrainer(dificuldade) : null;
        const tournament = tipo === 'torneio' ? rollTournament(torneioId) : null;
        if (tipo === 'torneio' && !tournament) throw new HttpError(404, 'Torneio não encontrado.');
        const opponents = [];
        const wild = tipo === 'selvagem' ? (selvagem ? getEspecie(selvagem.especieId) : rollWild(getCatalogo(), randomInt, completed, requestedRegion)) : null;
        if (wild && !legendaryUnlocked(wild, completed)) throw new HttpError(403, 'Derrote a Elite dos 4 desta região para encontrar este Pokémon lendário ou mítico.');
        const encounterRegion = requestedRegion === 'todas' ? REGIONS.filter((entry) => wild.id >= entry.minSpecies && wild.id <= entry.maxSpecies && regionUnlocked(entry.id, completed)).at(-1) : wildRegion;
        const lineup = leader ? leader.pokemon.map((id) => ({ id, nivel: leader.nivel })) : trainer ? trainer.pokemon : tournament ? tournament.treinadores[0].pokemon : [{ id: wild.id, nivel: selvagem?.nivel ?? randomInt(2, wildLevelCap(completed, encounterRegion.id) + 1) }];
        for (const { id, nivel: enemyLevel } of lineup) {
          opponents.push(makeCombatant(id, enemyLevel, tournament ? false : rollShiny(randomInt, shinyRolls(completed, generationForSpecies(id), owned.has('shiny-charm'))), await movesFor(tx, id, enemyLevel)));
        }
        if (tournament) {
          const paid = await tx.save.updateMany({ where: { id: save.id, moedas: { gte: tournament.entrada } }, data: { moedas: { decrement: tournament.entrada } } });
          if (paid.count !== 1) throw new HttpError(409, 'Pokédólares insuficientes para entrar no torneio.');
        }
        const state = { tipo, regiao: tipo === 'selvagem' ? requestedRegion : leader?.regiao ?? null, regiaoEncontro: tipo === 'selvagem' ? encounterRegion.id : null, desafioId: leader?.id ?? null, treinador: leader?.nome ?? trainer?.nome ?? tournament?.treinadores[0].nome ?? null, dificuldade: trainer?.dificuldade ?? null, recompensa: trainer?.recompensa ?? tournament?.recompensa ?? null, torneio: tournament ? { id: tournament.id, nome: tournament.nome, entrada: tournament.entrada, rodada: 1, treinadores: tournament.treinadores } : null, xpPorPokemon: {}, itensGanhos: [], limiteNivel: leader?.nivel ?? null, totalOponentes: opponents.length, jogador: null, reservas: [], oponente: opponents.shift(), fila: opponents, rodada: 1, xpGanho: 0, moedasGanhas: 0, resultado: null, aguardandoReviver: false, logs: [leader ? `${leader.nome} desafiou você!` : trainer ? `${trainer.nome} desafiou você!` : tournament ? `Torneio ${tournament.nome}: rodada 1 de 8 contra ${tournament.treinadores[0].nome}.` : 'Um Pokémon selvagem apareceu! Escolha quem vai enfrentá-lo.'] };
        if (tipo === 'selvagem' && state.oponente.shiny) await tx.batalhaEvento.create({ data: { saveId: save.id, tipo: 'shiny_encontrado', especieId: wild.id, regiao: encounterRegion.id, shiny: true, descricao: `${state.oponente.nome} shiny encontrado` } });
        if (!save.kitEntregue) {
          await tx.save.update({ where: { id: save.id }, data: { kitEntregue: true } });
          for (const [itemId, quantidade] of [['poke-ball', 10], ['potion', 5]]) await tx.itemInventario.upsert({ where: { saveId_itemId: { saveId: save.id, itemId } }, create: { saveId: save.id, itemId, quantidade }, update: { quantidade: { increment: quantidade } } });
        }
        const battle = await tx.batalha.create({ data: { saveId: save.id, estado: state } });
        return { id: battle.id, versao: battle.versao, ...state };
      }, { isolationLevel: 'Serializable', timeout: 20_000 });
    },
    async act(usuarioId, action) {
      return db.$transaction(async (tx) => {
        const save = await tx.save.findUnique({ where: { usuarioId } });
        if (!save) throw new HttpError(404, 'Save nao encontrado.');
        const battle = await tx.batalha.findUnique({ where: { saveId: save.id } });
        if (!battle || battle.id !== action.batalhaId || battle.versao !== action.versao) throw new HttpError(409, 'A batalha mudou. Recarregue seu estado.');
        const state = structuredClone(battle.estado);
        if (state.resultado) throw new HttpError(409, 'Esta batalha ja terminou.');
        if (action.acao === 'abandonar') {
          if (state.tipo !== 'torneio') throw new HttpError(400, 'Só é possível abandonar um torneio.');
          state.resultado = 'desistencia'; log(state, 'Você abandonou o torneio. A inscrição não é devolvida.');
        } else if (action.acao === 'escolher') {
          if (state.jogador) throw new HttpError(409, 'Pokémon desta batalha já escolhido.');
          const ids = action.pokemonIds ?? [action.pokemonId];
          if (ids.length > state.totalOponentes || new Set(ids).size !== ids.length) throw new HttpError(400, `Escolha até ${state.totalOponentes} Pokémon diferentes.`);
          const members = await tx.pokemonCapturado.findMany({ where: { id: { in: ids }, saveId: save.id } });
          if (members.length !== ids.length) throw new HttpError(404, 'Pokémon não encontrado na sua coleção.');
          const combatants = [];
          for (const id of ids) {
            const member = members.find((entry) => entry.id === id);
            const level = state.limiteNivel ? Math.min(member.nivel, state.limiteNivel) : member.nivel;
            combatants.push(makeCombatant(member.especieId, level, member.shiny, await playerMovesFor(tx, member), member.id, member.apelido, member.megaForma, member.gmaxForma));
          }
          state.jogador = combatants.shift();
          state.reservas = combatants;
          log(state, `${state.jogador.nome} entrou em batalha!`);
        } else if (action.acao === 'trocar') {
          if (!state.jogador) throw new HttpError(409, 'Escolha sua equipe primeiro.');
          const index = (state.reservas ?? []).findIndex((member) => member.pokemonId === action.pokemonId);
          if (index < 0) throw new HttpError(404, 'Pokémon não está entre as reservas.');
          const [next] = state.reservas.splice(index, 1);
          if (state.jogador.hp > 0) state.reservas.push(state.jogador);
          const freeSwitch = state.aguardandoReviver;
          state.jogador = next;
          state.aguardandoReviver = false;
          log(state, `${next.nome} entrou em batalha!`);
          if (!freeSwitch) opponentTurn(state);
        } else if (action.acao === 'procurar') {
          if (state.tipo !== 'selvagem' || state.jogador) throw new HttpError(409, 'A nova busca só está disponível antes de escolher o Pokémon para um encontro selvagem.');
          const completed = await progress(tx, save.id);
          const owned = new Set((await tx.itemInventario.findMany({ where: { saveId: save.id, quantidade: { gt: 0 } }, select: { itemId: true } })).map((item) => item.itemId));
          let wild = rollWild(getCatalogo(), randomInt, completed, state.regiao);
          for (let attempt = 0; wild.id === state.oponente.especieId && attempt < 20; attempt++) wild = rollWild(getCatalogo(), randomInt, completed, state.regiao);
          if (wild.id === state.oponente.especieId) {
            const alternatives = getCatalogo().pokemon.filter((species) => species.id !== state.oponente.especieId && legendaryUnlocked(species, completed) && REGIONS.some((region) => species.id >= region.minSpecies && species.id <= region.maxSpecies && regionUnlocked(region.id, completed) && (state.regiao === 'todas' || state.regiao === region.id)));
            wild = alternatives[randomInt(alternatives.length)];
          }
          const encounterRegion = REGIONS.find((region) => wild.id >= region.minSpecies && wild.id <= region.maxSpecies);
          const level = randomInt(2, wildLevelCap(completed, encounterRegion.id) + 1);
          state.oponente = makeCombatant(wild.id, level, rollShiny(randomInt, shinyRolls(completed, generationForSpecies(wild.id), owned.has('shiny-charm'))), await movesFor(tx, wild.id, level));
          state.regiaoEncontro = encounterRegion.id;
          state.logs = [`Outro Pokémon selvagem apareceu: ${state.oponente.nome}! Escolha quem vai enfrentá-lo ou continue procurando.`];
          if (state.oponente.shiny) await tx.batalhaEvento.create({ data: { saveId: save.id, tipo: 'shiny_encontrado', especieId: wild.id, regiao: encounterRegion.id, shiny: true, descricao: `${state.oponente.nome} shiny encontrado` } });
        } else if (action.acao === 'fugir') {
          if (state.tipo !== 'selvagem') throw new HttpError(400, 'Nao e possivel fugir de um desafio.');
          state.resultado = 'fuga'; log(state, 'Você fugiu da batalha.');
        } else if (!state.jogador) {
          throw new HttpError(409, 'Escolha um Pokémon antes de agir.');
        } else if (action.acao === 'desistir') {
          if (!state.aguardandoReviver) throw new HttpError(400, 'Só é possível aceitar a derrota após seu Pokémon desmaiar.');
          state.resultado = 'derrota'; log(state, 'Você perdeu a batalha.');
        } else if (action.acao === 'usar-item') {
          const item = HEALING_ITEMS[action.itemId];
          if (!item) throw new HttpError(400, 'Item de cura inválido.');
          const missing = state.jogador.maxHp - state.jogador.hp;
          if (item.revive ? state.jogador.hp !== 0 : state.jogador.hp === 0 || missing === 0) throw new HttpError(409, 'Este item não pode ser usado agora.');
          const used = await tx.itemInventario.updateMany({ where: { saveId: save.id, itemId: action.itemId, quantidade: { gt: 0 } }, data: { quantidade: { decrement: 1 } } });
          if (used.count !== 1) throw new HttpError(409, 'Item de cura indisponível.');
          const healed = healCombatant(state.jogador, action.itemId);
          log(state, `${state.jogador.nome} recuperou ${healed} HP com ${displayName(action.itemId)}.`);
          if (state.aguardandoReviver) state.aguardandoReviver = false;
          else opponentTurn(state);
        } else if (action.acao === 'capturar') {
          if (state.aguardandoReviver) throw new HttpError(409, 'Reviva seu Pokémon antes de capturar.');
          if (state.tipo !== 'selvagem') throw new HttpError(400, 'Nao e possivel capturar o Pokemon do treinador.');
          if (!Object.hasOwn(CAPTURE_MULTIPLIER, action.itemId)) throw new HttpError(400, 'Poké Bola inválida.');
          const item = await tx.itemInventario.updateMany({ where: { saveId: save.id, itemId: action.itemId, quantidade: { gt: 0 } }, data: { quantidade: { decrement: 1 } } });
          if (item.count !== 1) throw new HttpError(409, 'Poké Bola indisponivel.');
          const species = getEspecie(state.oponente.especieId);
          const charm = await tx.itemInventario.findUnique({ where: { saveId_itemId: { saveId: save.id, itemId: 'catching-charm' } } });
          const completed = charm?.quantidade > 0 ? await progress(tx, save.id) : [];
          const multiplier = catchCharmMultiplier(completed, generationForSpecies(species.id), charm?.quantidade > 0);
          const chance = action.itemId === 'master-ball' ? 1 : Math.min(.95, species.taxaCaptura / 255 * CAPTURE_MULTIPLIER[action.itemId] * (3 - 2 * state.oponente.hp / state.oponente.maxHp) / 3 * multiplier);
          if (randomInt(10000) < chance * 10000) { state.resultado = 'captura'; log(state, `${state.oponente.nome} foi capturado!`); }
          else { log(state, `${state.oponente.nome} escapou da Poké Bola.`); opponentTurn(state); }
        } else {
          if (state.aguardandoReviver) throw new HttpError(409, 'Reviva seu Pokémon antes de atacar.');
          const move = state.jogador.ataques.find((entry) => entry.nome === action.golpe);
          if (!move) throw new HttpError(400, 'Ataque indisponivel para este Pokemon.');
          const enemyMove = aiMove(state.oponente, state.jogador);
          const first = move.prioridade !== enemyMove.prioridade ? move.prioridade > enemyMove.prioridade : state.jogador.stats.speed !== state.oponente.stats.speed ? state.jogador.stats.speed > state.oponente.stats.speed : randomInt(2) === 0;
          if (first) {
            attack(state, state.jogador, state.oponente, move);
            if (state.oponente.hp === 0) { await recordWildDefeat(tx, save.id, state); afterFaint(state); if (state.tipo === 'torneio' && !state.jogador && !state.resultado) await loadTournamentRound(tx, state); }
            else opponentTurn(state);
          } else {
            attack(state, state.oponente, state.jogador, enemyMove);
            if (state.jogador.hp === 0) { state.aguardandoReviver = true; log(state, `${state.jogador.nome} desmaiou. ${state.reservas?.length ? 'Escolha outro Pokémon ou use um Reviver.' : 'Use um Reviver ou aceite a derrota.'}`); }
            else { attack(state, state.jogador, state.oponente, move); if (state.oponente.hp === 0) { await recordWildDefeat(tx, save.id, state); afterFaint(state); if (state.tipo === 'torneio' && !state.jogador && !state.resultado) await loadTournamentRound(tx, state); } }
          }
        }
        if (!['escolher', 'procurar'].includes(action.acao)) state.rodada++;
        if (state.resultado) return finish(tx, save, state, action);
        const updated = await tx.batalha.updateMany({ where: { id: battle.id, versao: action.versao }, data: { estado: state, versao: { increment: 1 } } });
        if (updated.count !== 1) throw new HttpError(409, 'A batalha mudou. Recarregue seu estado.');
        return { id: battle.id, versao: battle.versao + 1, ...state };
      }, { isolationLevel: 'Serializable', timeout: 20_000 });
    },
  };
}
