import { HttpError } from '../lib/errors.js';
import { getCatalogo, getEspecie } from './catalogo.js';

const ballPrices = { 'poke-ball': 200, 'great-ball': 600, 'ultra-ball': 1200 };

export function pokemonSaleValue(member) {
  const species = getEspecie(member.especieId);
  const ball = member.bolaCaptura ?? 'poke-ball';
  const ballValue = ball === 'master-ball' ? member.nivel * 20 : (ballPrices[ball] ?? ballPrices['poke-ball']) / 2 + member.nivel * 10;
  const investments = Math.max(0, member.investimentoItens ?? 0);
  const legendaryMultiplier = species.lendario || species.mitico ? 3 : 1;
  const shinyMultiplier = member.shiny ? 10 : 1;
  return Math.floor((ballValue + investments) * legendaryMultiplier * shinyMultiplier);
}

export function createMarketService(db) {
  return {
    async values(usuarioId) {
      const members = await db.pokemonCapturado.findMany({ where: { save: { usuarioId } } });
      return members.map((member) => ({ pokemonId: member.id, valor: pokemonSaleValue(member), bolaCaptura: member.bolaCaptura ?? 'poke-ball', investimentoItens: member.investimentoItens }));
    },
    async sell(usuarioId, pokemonIds) {
      return db.$transaction(async (tx) => {
        const save = await tx.save.findUnique({ where: { usuarioId }, select: { id: true } });
        if (!save) throw new HttpError(404, 'Save não encontrado.');
        const [members, total, battle] = await Promise.all([
          tx.pokemonCapturado.findMany({ where: { saveId: save.id, id: { in: pokemonIds } } }),
          tx.pokemonCapturado.count({ where: { saveId: save.id } }),
          tx.batalha.findUnique({ where: { saveId: save.id }, select: { id: true } }),
        ]);
        if (members.length !== pokemonIds.length) throw new HttpError(404, 'Um ou mais Pokémon não pertencem à sua coleção.');
        if (members.some((member) => member.favorito)) throw new HttpError(409, 'Remova a marca de favorito antes de vender este Pokémon.');
        if (total <= members.length) throw new HttpError(409, 'Mantenha pelo menos um Pokémon na coleção.');
        if (battle) throw new HttpError(409, 'Encerre a batalha atual antes de vender Pokémon.');
        const moedasGanhas = members.reduce((sum, member) => sum + pokemonSaleValue(member), 0);
        await tx.pokemonCapturado.deleteMany({ where: { saveId: save.id, id: { in: pokemonIds } } });
        const updated = await tx.save.update({ where: { id: save.id }, data: { moedas: { increment: moedasGanhas } } });
        return { vendidos: members.length, moedasGanhas, moedas: updated.moedas };
      }, { isolationLevel: 'Serializable', timeout: 20_000 });
    },
  };
}
