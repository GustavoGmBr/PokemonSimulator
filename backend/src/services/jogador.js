import { HttpError } from '../lib/errors.js';
import { criarDadosInicial } from './catalogo.js';

export function createJogadorService(db) {
  return {
    async getSave(usuarioId) {
      const save = await db.save.findUnique({ where: { usuarioId } });
      return save;
    },
    async novoSave(usuarioId, { nomeTreinador, substituirSaveId }) {
      return db.$transaction(async (tx) => {
        const usuario = await tx.usuario.findUnique({ where: { id: usuarioId }, select: { id: true } });
        if (!usuario) throw new HttpError(401, 'Usuario nao encontrado.');
        const atual = await tx.save.findUnique({ where: { usuarioId } });
        if ((atual?.id ?? null) !== substituirSaveId) {
          throw new HttpError(409, 'O save mudou. Atualize a tela antes de iniciar um novo jogo.');
        }
        if (atual) {
          // A hospedagem MySQL falha ao preparar deletes com muitas cascatas (erro 1615).
          // Apagar os filhos explicitamente tambem mantem a troca atomica do save.
          await tx.batalha.deleteMany({ where: { saveId: atual.id } });
          await tx.cassinoRodada.deleteMany({ where: { saveId: atual.id } });
          await tx.desafioConcluido.deleteMany({ where: { saveId: atual.id } });
          await tx.especieRegistrada.deleteMany({ where: { saveId: atual.id } });
          await tx.pokemonCapturado.deleteMany({ where: { saveId: atual.id } });
          await tx.itemInventario.deleteMany({ where: { saveId: atual.id } });
          await tx.batalhaEvento.deleteMany({ where: { saveId: atual.id } });
          await tx.missaoResgatada.deleteMany({ where: { saveId: atual.id } });
          await tx.save.delete({ where: { id: atual.id } });
        }
        return tx.save.create({ data: { usuarioId, nomeTreinador, iniciadoEm: new Date() } });
      }, { isolationLevel: 'Serializable', timeout: 15_000 });
    },
    async escolherInicial(usuarioId, { saveId, especieId }) {
      if (![1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501, 650, 653, 656, 722, 725, 728, 810, 813, 816, 906, 909, 912].includes(especieId)) throw new HttpError(400, 'Escolha um inicial valido.');
      const pokemon = criarDadosInicial(especieId);
      return db.$transaction(async (tx) => {
        // A atualizacao condicional bloqueia escolhas duplicadas e pedidos de saves antigos.
        const claimed = await tx.save.updateMany({
          where: { id: saveId, usuarioId, iniciadoEm: { not: null }, inicialEspecieId: null },
          data: { inicialEspecieId: especieId, kitEntregue: true },
        });
        if (claimed.count !== 1) throw new HttpError(409, 'Inicial ja escolhido ou save alterado. Carregue seu save novamente.');
        await tx.pokemonCapturado.create({ data: { ...pokemon, saveId } });
        for (const [itemId, quantidade] of [['poke-ball', 10], ['potion', 5]]) await tx.itemInventario.create({ data: { saveId, itemId, quantidade } });
        await tx.especieRegistrada.upsert({ where: { saveId_especieId: { saveId, especieId } }, create: { saveId, especieId }, update: {} });
        return tx.save.findUnique({ where: { id: saveId } });
      }, { isolationLevel: 'Serializable', timeout: 15_000 });
    },
    updateSave(usuarioId, data) {
      return db.save.update({ where: { usuarioId }, data: { nomeTreinador: data.nomeTreinador } });
    },
    getTime(usuarioId) {
      return db.pokemonCapturado.findMany({
        where: { save: { usuarioId } }, orderBy: [{ especieId: 'asc' }, { capturadoEm: 'asc' }],
      });
    },
    getPc(usuarioId) {
      return db.pokemonCapturado.findMany({
        where: { save: { usuarioId }, posicaoTime: null }, orderBy: { capturadoEm: 'asc' },
      });
    },
    getColecao(usuarioId) {
      return db.pokemonCapturado.findMany({
        where: { save: { usuarioId } }, orderBy: [{ especieId: 'asc' }, { capturadoEm: 'asc' }],
      });
    },
    async setFavorito(usuarioId, pokemonId, favorito) {
      const updated = await db.pokemonCapturado.updateMany({
        where: { id: pokemonId, save: { usuarioId } }, data: { favorito },
      });
      if (updated.count !== 1) throw new HttpError(404, 'Pokémon não encontrado na sua coleção.');
      return db.pokemonCapturado.findUnique({ where: { id: pokemonId } });
    },
    getInventario(usuarioId) {
      return db.itemInventario.findMany({ where: { save: { usuarioId }, itemId: { notIn: ['antidote', 'paralyze-heal', 'awakening', 'burn-heal', 'ice-heal', 'full-heal', 'ether', 'elixir'] } }, orderBy: { itemId: 'asc' } });
    },
    async getDex(usuarioId) {
      const save = await db.save.findUnique({ where: { usuarioId }, select: { id: true } });
      if (!save) return [];
      const [registered, owned] = await Promise.all([
        db.especieRegistrada.findMany({ where: { saveId: save.id }, select: { especieId: true } }),
        db.pokemonCapturado.findMany({ where: { saveId: save.id }, select: { especieId: true } }),
      ]);
      return [...new Set([...registered, ...owned].map((entry) => entry.especieId))];
    },
  };
}
