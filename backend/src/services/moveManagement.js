import { HttpError } from '../lib/errors.js';
import { getEspecie } from './catalogo.js';
import { equippedMoves, tmMoves, tmPrice, unlockedMoves } from './moveRules.js';

export function createMoveManagementService(db) {
  async function getMember(tx, usuarioId, pokemonId) {
    const member = await tx.pokemonCapturado.findFirst({ where: { id: pokemonId, save: { usuarioId } } });
    if (!member) throw new HttpError(404, 'Pokémon não encontrado na sua coleção.');
    return member;
  }
  async function requireIdle(tx, saveId) {
    if (await tx.batalha.findUnique({ where: { saveId }, select: { id: true } })) throw new HttpError(409, 'Termine a batalha atual para alterar os ataques.');
  }
  return {
    async options(usuarioId, pokemonId) {
      const member = await getMember(db, usuarioId, pokemonId);
      const species = getEspecie(member.especieId);
      const unlocked = unlockedMoves(member, species);
      return { equipados: equippedMoves(member, species), desbloqueados: unlocked,
        tms: tmMoves(species).map((move) => ({ ...move, preco: tmPrice(move), aprendido: unlocked.includes(move.nome) })) };
    },
    async equip(usuarioId, pokemonId, names) {
      return db.$transaction(async (tx) => {
        const member = await getMember(tx, usuarioId, pokemonId);
        await requireIdle(tx, member.saveId);
        const species = getEspecie(member.especieId);
        const unlocked = unlockedMoves(member, species);
        if (names.some((name) => !unlocked.includes(name))) throw new HttpError(400, 'Este Pokémon ainda não aprendeu um dos ataques escolhidos.');
        return tx.pokemonCapturado.update({ where: { id: member.id }, data: { golpes: names.map((nome) => ({ nome })), golpesDesbloqueados: unlocked } });
      }, { isolationLevel: 'Serializable', timeout: 20_000 });
    },
    async buyTm(usuarioId, pokemonId, name) {
      return db.$transaction(async (tx) => {
        const member = await getMember(tx, usuarioId, pokemonId);
        await requireIdle(tx, member.saveId);
        const species = getEspecie(member.especieId);
        const move = tmMoves(species).find((entry) => entry.nome === name);
        if (!move) throw new HttpError(400, 'Este Pokémon não pode aprender essa TM.');
        const unlocked = unlockedMoves(member, species);
        if (unlocked.includes(name)) throw new HttpError(409, 'Este Pokémon já aprendeu esse ataque.');
        const price = tmPrice(move);
        const paid = await tx.save.updateMany({ where: { id: member.saveId, moedas: { gte: price } }, data: { moedas: { decrement: price } } });
        if (paid.count !== 1) throw new HttpError(409, 'Pokédólares insuficientes.');
        const updated = await tx.pokemonCapturado.update({ where: { id: member.id }, data: { golpesDesbloqueados: [...unlocked, name] } });
        return { pokemon: updated, moedasRestantes: (await tx.save.findUnique({ where: { id: member.saveId }, select: { moedas: true } })).moedas };
      }, { isolationLevel: 'Serializable', timeout: 20_000 });
    },
  };
}
