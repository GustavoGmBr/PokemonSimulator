import { createHash } from 'node:crypto';
import { HttpError } from '../lib/errors.js';
import { REGIONS, regionUnlocked } from './battleRules.js';

export const MISSION_DURATION_MS = 2 * 60 * 60 * 1000;
export const missionPeriod = (now = Date.now()) => Math.floor(now / MISSION_DURATION_MS);

export function generateMissions(save, completed, period = missionPeriod()) {
  const bytes = createHash('sha256').update(`${save.id}:${period}`).digest();
  const regions = REGIONS.filter((region) => regionUnlocked(region.id, completed));
  const region = (offset) => regions[bytes[offset] % regions.length];
  const difficulties = ['facil', 'medio', 'dificil'];
  const unlockedGyms = REGIONS.flatMap((entry) => entry.gyms).filter((gym) => completed.includes(gym.id)).length;
  const tiers = unlockedGyms < 4 ? ['muito-facil'] : unlockedGyms < 16 ? ['muito-facil', 'facil'] : unlockedGyms < 32 ? ['facil', 'intermediario'] : ['intermediario', 'dificil', 'muito-dificil', 'copa-prime'];
  const missions = [];
  for (let index = 0; index < 3; index++) {
    const selected = region(index);
    const goal = index + 1 + period % 3;
    missions.push({ indice: missions.length, tipo: 'capturar', regiao: selected.id, titulo: `Capture ${goal} espécie${goal > 1 ? 's' : ''} diferente${goal > 1 ? 's' : ''} de ${selected.nome}`, alvo: goal, recompensa: { moedas: 150 + selected.geracao * 50 + index * 100, itens: [{ itemId: 'poke-ball', quantidade: 2 + index }] } });
  }
  for (let index = 0; index < 3; index++) {
    const selected = region(index + 3);
    const goal = 2 + index * 2;
    missions.push({ indice: missions.length, tipo: 'derrotar', regiao: selected.id, titulo: `Derrote ${goal} Pokémon selvagens de ${selected.nome}`, alvo: goal, recompensa: { moedas: 200 + selected.geracao * 60 + index * 100, itens: [{ itemId: 'exp-candy-p', quantidade: 1 + index }] } });
  }
  for (let index = 0; index < 2; index++) {
    const difficulty = difficulties[bytes[8 + index] % (unlockedGyms < 8 ? 1 : unlockedGyms < 24 ? 2 : 3)];
    const goal = index + 1;
    missions.push({ indice: missions.length, tipo: 'vencer_treinador', dificuldade: difficulty, titulo: `Vença ${goal} treinador${goal > 1 ? 'es' : ''} no modo ${difficulty}`, alvo: goal, recompensa: { moedas: 300 + difficulties.indexOf(difficulty) * 200 + index * 200, itens: [{ itemId: 'great-ball', quantidade: 1 + index }] } });
  }
  for (let index = 0; index < 2; index++) {
    const tournament = tiers[bytes[10 + index] % tiers.length];
    const goal = index + 1;
    missions.push({ indice: missions.length, tipo: 'vencer_torneio', torneioId: tournament, titulo: `Vença ${goal} vez${goal > 1 ? 'es' : ''} o torneio ${tournament.replaceAll('-', ' ')}`, alvo: goal, recompensa: { moedas: 500 + tiers.indexOf(tournament) * 300 + index * 400, itens: [{ itemId: 'exp-candy-m', quantidade: 1 + index }] } });
  }
  return missions;
}

function eventWhere(saveId, mission, startedAt) {
  return { saveId, tipo: mission.tipo, criadoEm: { gte: startedAt }, ...(mission.regiao ? { regiao: mission.regiao } : {}), ...(mission.dificuldade ? { dificuldade: mission.dificuldade } : {}), ...(mission.torneioId ? { torneioId: mission.torneioId } : {}) };
}

function progressFor(mission, events) {
  const matching = events.filter((event) => event.tipo === mission.tipo && (!mission.regiao || event.regiao === mission.regiao) && (!mission.dificuldade || event.dificuldade === mission.dificuldade) && (!mission.torneioId || event.torneioId === mission.torneioId));
  return mission.tipo === 'capturar' ? new Set(matching.map((event) => event.especieId)).size : matching.length;
}

export function createJourneyService(db) {
  async function context(tx, usuarioId, now = Date.now()) {
    const save = await tx.save.findUnique({ where: { usuarioId }, select: { id: true } });
    if (!save) throw new HttpError(404, 'Save não encontrado.');
    const period = missionPeriod(now);
    const startedAt = new Date(period * MISSION_DURATION_MS);
    const completed = (await tx.desafioConcluido.findMany({ where: { saveId: save.id, vencidoEm: { lt: startedAt } }, select: { desafioId: true } })).map((entry) => entry.desafioId);
    return { save, period, startedAt, missions: generateMissions(save, completed, period) };
  }
  return {
    async missions(usuarioId) {
      const { save, period, startedAt, missions } = await context(db, usuarioId);
      const [events, claimed] = await Promise.all([
        db.batalhaEvento.findMany({ where: { saveId: save.id, criadoEm: { gte: startedAt } }, select: { tipo: true, especieId: true, regiao: true, dificuldade: true, torneioId: true } }),
        db.missaoResgatada.findMany({ where: { saveId: save.id, periodo: period }, select: { indice: true } }),
      ]);
      const claimedIds = new Set(claimed.map((entry) => entry.indice));
      return { periodo: period, expiraEm: new Date((period + 1) * MISSION_DURATION_MS), missoes: missions.map((mission) => ({ ...mission, progresso: progressFor(mission, events), resgatada: claimedIds.has(mission.indice) })) };
    },
    async claim(usuarioId, period, index) {
      try {
        return await db.$transaction(async (tx) => {
          const current = await context(tx, usuarioId);
          if (period !== current.period) throw new HttpError(409, 'As missões foram renovadas. Atualize a página.');
          const mission = current.missions[index];
          if (!mission) throw new HttpError(404, 'Missão não encontrada.');
          const already = await tx.missaoResgatada.findUnique({ where: { saveId_periodo_indice: { saveId: current.save.id, periodo: period, indice: index } } });
          if (already) throw new HttpError(409, 'Recompensa já resgatada.');
          const progress = mission.tipo === 'capturar' ? new Set((await tx.batalhaEvento.findMany({ where: eventWhere(current.save.id, mission, current.startedAt), select: { especieId: true } })).map((event) => event.especieId)).size : await tx.batalhaEvento.count({ where: eventWhere(current.save.id, mission, current.startedAt) });
          if (progress < mission.alvo) throw new HttpError(409, 'Missão ainda não concluída.');
          await tx.missaoResgatada.create({ data: { saveId: current.save.id, periodo: period, indice: index } });
          await tx.save.update({ where: { id: current.save.id }, data: { moedas: { increment: mission.recompensa.moedas } } });
          for (const item of mission.recompensa.itens) await tx.itemInventario.upsert({ where: { saveId_itemId: { saveId: current.save.id, itemId: item.itemId } }, create: { saveId: current.save.id, ...item }, update: { quantidade: { increment: item.quantidade } } });
          return { recompensa: mission.recompensa };
        }, { isolationLevel: 'Serializable' });
      } catch (error) {
        if (error.code === 'P2002') throw new HttpError(409, 'Recompensa já resgatada.');
        throw error;
      }
    },
    async history(usuarioId) {
      const save = await db.save.findUnique({ where: { usuarioId }, select: { id: true } });
      if (!save) throw new HttpError(404, 'Save não encontrado.');
      const [events, victories, defeats, shinyEncounters, captures] = await Promise.all([
        db.batalhaEvento.findMany({ where: { saveId: save.id }, orderBy: { criadoEm: 'desc' }, take: 60 }),
        db.batalhaEvento.count({ where: { saveId: save.id, tipo: 'batalha', resultado: 'vitoria' } }),
        db.batalhaEvento.count({ where: { saveId: save.id, tipo: 'batalha', resultado: 'derrota' } }),
        db.batalhaEvento.count({ where: { saveId: save.id, tipo: 'shiny_encontrado' } }),
        db.batalhaEvento.count({ where: { saveId: save.id, tipo: 'capturar' } }),
      ]);
      return { resumo: { vitorias: victories, derrotas: defeats, shiniesEncontrados: shinyEncounters, capturas: captures }, eventos: events };
    },
  };
}
