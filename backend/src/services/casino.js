import { randomInt } from 'node:crypto';
import { HttpError } from '../lib/errors.js';
import { getCatalogo } from './catalogo.js';
import { pokemonSaleValue } from './market.js';

export const CASINO_POKEMON = ['Pikachu', 'Bulbasaur', 'Charmander', 'Squirtle'];
export const CASINO_COLORS = ['vermelho', 'azul', 'verde'];
export const CASINO_CHIP_COST = 5;
export const CASINO_MASTER_BALL_PRICE = 10000;
const MAX_BALANCE = 2_000_000_000;
const SLOT_SYMBOLS = ['master-ball', 'bar', 'pikachu', 'charmander', 'replay', 'cherry', 'blank'];
const SLOT_WEIGHTS = [1, 2, 4, 4, 4, 5, 10];
const SLOT_MULTIPLIERS = { 'master-ball': 100, bar: 30, pikachu: 5, charmander: 5, replay: 1 };
const SLOT_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 4, 8], [6, 4, 2]];

function drawWeighted() {
  let ticket = randomInt(SLOT_WEIGHTS.reduce((sum, weight) => sum + weight, 0));
  for (let index = 0; index < SLOT_WEIGHTS.length; index++) {
    ticket -= SLOT_WEIGHTS[index];
    if (ticket < 0) return SLOT_SYMBOLS[index];
  }
  return 'blank';
}

export function slotPayout(grid, bet) {
  const wins = [];
  for (const [index, positions] of SLOT_LINES.entries()) {
    const symbols = positions.map((position) => grid[position]);
    const multiplier = symbols.every((symbol) => symbol === symbols[0]) ? SLOT_MULTIPLIERS[symbols[0]] ?? 0 : symbols[0] === 'cherry' ? 0.5 : 0;
    if (multiplier) wins.push({ linha: index + 1, simbolo: symbols[0], multiplicador: multiplier, premio: Math.floor(bet * multiplier) });
  }
  return { premio: wins.reduce((sum, win) => sum + win.premio, 0), linhas: wins };
}

export function cardPayout(card, bet) {
  const hit = bet.tipo === 'exata' ? bet.pokemon === card.pokemon && bet.numero === card.numero
    : bet.tipo === 'dupla' ? bet.pokemon === card.pokemon && [bet.numero, bet.numero + 1].includes(card.numero)
      : bet.tipo === 'numero' ? bet.numero === card.numero : bet.pokemon === card.pokemon;
  return hit ? bet.valor * { exata: 24, dupla: 12, numero: 6, pokemon: 4 }[bet.tipo] : 0;
}

export function rouletteMultiplier(result, bet) {
  return bet.tipo === 'exata' ? Number(bet.pokemon === result.pokemon && bet.cor === result.cor) * 12
    : bet.tipo === 'pokemon' ? Number(bet.pokemon === result.pokemon) * 4
      : Number(bet.cor === result.cor) * 3;
}

function casinoItem(itemId) {
  const item = getCatalogo().itens.find((entry) => entry.nome === itemId);
  if (!item || !['captura', 'cura'].includes(item.categoria)) return null;
  return { itemId, nome: item.nomeExibicao, preco: itemId === 'master-ball' ? CASINO_MASTER_BALL_PRICE : Math.ceil(item.precoLoja / CASINO_CHIP_COST), sprite: item.sprite };
}

function publicVoltorb(round) {
  if (!round) return null;
  const state = round.estado;
  const lines = Array.from({ length: 5 }, (_, row) => {
    const cells = state.tabuleiro.slice(row * 5, row * 5 + 5);
    return { pontos: cells.filter((cell) => cell !== 0).reduce((sum, cell) => sum + cell, 0), voltorbs: cells.filter((cell) => cell === 0).length };
  });
  const columns = Array.from({ length: 5 }, (_, col) => {
    const cells = Array.from({ length: 5 }, (_, row) => state.tabuleiro[row * 5 + col]);
    return { pontos: cells.filter((cell) => cell !== 0).reduce((sum, cell) => sum + cell, 0), voltorbs: cells.filter((cell) => cell === 0).length };
  });
  return { aposta: state.aposta, acumulado: state.acumulado, restantes: state.restantes, casas: state.tabuleiro.map((cell, index) => state.abertas.includes(index) ? cell : null), linhas: lines, colunas: columns };
}

function makeBoard() {
  const board = [...Array(3).fill(0), ...Array(4).fill(2), ...Array(2).fill(3), ...Array(16).fill(1)];
  for (let index = board.length - 1; index > 0; index--) {
    const selected = randomInt(index + 1);
    [board[index], board[selected]] = [board[selected], board[index]];
  }
  return board;
}

function checkBet(save, bet) {
  if (bet > save.fichas) throw new HttpError(409, 'Fichas insuficientes.');
}

function checkBalance(value) {
  if (!Number.isSafeInteger(value) || value > MAX_BALANCE) throw new HttpError(409, 'O prêmio excede o limite da carteira. Reduza a aposta.');
}

export function createCasinoService(db) {
  async function saveFor(tx, usuarioId) {
    const save = await tx.save.findUnique({ where: { usuarioId } });
    if (!save?.inicialEspecieId) throw new HttpError(409, 'Inicie sua jornada antes de entrar no cassino.');
    return save;
  }
  return {
    async overview(usuarioId) {
      const save = await saveFor(db, usuarioId);
      const round = await db.cassinoRodada.findUnique({ where: { saveId: save.id } });
      return { fichas: save.fichas, moedas: save.moedas, custoFicha: CASINO_CHIP_COST, itens: getCatalogo().itens.filter((item) => ['captura', 'cura'].includes(item.categoria)).map((item) => casinoItem(item.nome)), voltorb: publicVoltorb(round) };
    },
    async buyChips(usuarioId, quantidade) {
      return db.$transaction(async (tx) => {
        const save = await saveFor(tx, usuarioId);
        const cost = quantidade * CASINO_CHIP_COST;
        if (save.fichas + quantidade > MAX_BALANCE) throw new HttpError(409, 'Limite de fichas excedido.');
        const paid = await tx.save.updateMany({ where: { id: save.id, moedas: { gte: cost } }, data: { moedas: { decrement: cost }, fichas: { increment: quantidade } } });
        if (paid.count !== 1) throw new HttpError(409, 'Pokédólares insuficientes.');
        return { fichas: save.fichas + quantidade, moedas: save.moedas - cost };
      }, { isolationLevel: 'Serializable' });
    },
    async buyItems(usuarioId, entries) {
      const lines = entries.map(({ itemId, quantidade }) => ({ item: casinoItem(itemId), itemId, quantidade }));
      if (lines.some(({ item }) => !item)) throw new HttpError(400, 'Item indisponível no cassino.');
      const cost = lines.reduce((sum, { item, quantidade }) => sum + item.preco * quantidade, 0);
      return db.$transaction(async (tx) => {
        const save = await saveFor(tx, usuarioId);
        checkBet(save, cost);
        for (const { itemId, quantidade } of lines) await tx.itemInventario.upsert({ where: { saveId_itemId: { saveId: save.id, itemId } }, create: { saveId: save.id, itemId, quantidade }, update: { quantidade: { increment: quantidade } } });
        await tx.save.update({ where: { id: save.id }, data: { fichas: { decrement: cost } } });
        return { custo: cost, fichas: save.fichas - cost };
      }, { isolationLevel: 'Serializable' });
    },
    async slots(usuarioId, aposta) {
      return db.$transaction(async (tx) => {
        const save = await saveFor(tx, usuarioId);
        checkBet(save, aposta);
        const symbols = Array.from({ length: 9 }, drawWeighted);
        const result = slotPayout(symbols, aposta);
        checkBalance(save.fichas - aposta + result.premio);
        await tx.save.update({ where: { id: save.id }, data: { fichas: save.fichas - aposta + result.premio } });
        return { simbolos: symbols, aposta, ...result, fichas: save.fichas - aposta + result.premio };
      }, { isolationLevel: 'Serializable' });
    },
    async cards(usuarioId, bets) {
      const total = bets.reduce((sum, bet) => sum + bet.valor, 0);
      return db.$transaction(async (tx) => {
        const save = await saveFor(tx, usuarioId);
        checkBet(save, total);
        const card = { pokemon: CASINO_POKEMON[randomInt(4)], numero: randomInt(1, 7) };
        const details = bets.map((bet) => ({ ...bet, premio: cardPayout(card, bet) }));
        const premio = details.reduce((sum, bet) => sum + bet.premio, 0);
        checkBalance(save.fichas - total + premio);
        await tx.save.update({ where: { id: save.id }, data: { fichas: save.fichas - total + premio } });
        return { carta: card, apostas: details, custo: total, premio, fichas: save.fichas - total + premio };
      }, { isolationLevel: 'Serializable' });
    },
    async roulette(usuarioId, bets, pokemonWager) {
      const total = bets.reduce((sum, bet) => sum + bet.valor, 0);
      return db.$transaction(async (tx) => {
        const save = await saveFor(tx, usuarioId);
        checkBet(save, total);
        const result = { pokemon: CASINO_POKEMON[randomInt(4)], cor: CASINO_COLORS[randomInt(3)] };
        const details = bets.map((bet) => ({ ...bet, premio: bet.valor * rouletteMultiplier(result, bet) }));
        const premio = details.reduce((sum, bet) => sum + bet.premio, 0);
        let pokemonPremio = null;
        if (pokemonWager) {
          const [member, count, battle] = await Promise.all([
            tx.pokemonCapturado.findFirst({ where: { id: pokemonWager.pokemonId, saveId: save.id } }),
            tx.pokemonCapturado.count({ where: { saveId: save.id } }),
            tx.batalha.findUnique({ where: { saveId: save.id }, select: { id: true } }),
          ]);
          if (!member) throw new HttpError(404, 'Pokémon apostado não encontrado.');
          if (member.favorito) throw new HttpError(409, 'Remova a marca de favorito antes de apostar este Pokémon.');
          if (count <= 1) throw new HttpError(409, 'Mantenha pelo menos um Pokémon na coleção.');
          if (battle) throw new HttpError(409, 'Encerre a batalha antes de apostar Pokémon.');
          const multiplier = rouletteMultiplier(result, pokemonWager);
          pokemonPremio = { pokemonId: member.id, valorBase: pokemonSaleValue(member), multiplicador: multiplier, ganho: pokemonSaleValue(member) * multiplier };
          checkBalance(save.moedas + pokemonPremio.ganho);
          await tx.pokemonCapturado.delete({ where: { id: member.id } });
        }
        checkBalance(save.fichas - total + premio);
        await tx.save.update({ where: { id: save.id }, data: { fichas: save.fichas - total + premio, moedas: save.moedas + (pokemonPremio?.ganho ?? 0) } });
        return { resultado: result, apostas: details, custo: total, premio, pokemonPremio, fichas: save.fichas - total + premio, moedas: save.moedas + (pokemonPremio?.ganho ?? 0) };
      }, { isolationLevel: 'Serializable' });
    },
    async startVoltorb(usuarioId, aposta) {
      return db.$transaction(async (tx) => {
        const save = await saveFor(tx, usuarioId);
        checkBet(save, aposta);
        if (save.fichas - aposta + aposta * 144 > MAX_BALANCE) throw new HttpError(409, 'A aposta pode gerar um prêmio acima do limite da carteira. Reduza o valor.');
        if (await tx.cassinoRodada.findUnique({ where: { saveId: save.id } })) throw new HttpError(409, 'Termine a rodada atual de Voltorb Flip.');
        const state = { aposta, acumulado: aposta, tabuleiro: makeBoard(), abertas: [], restantes: 6 };
        await tx.save.update({ where: { id: save.id }, data: { fichas: { decrement: aposta } } });
        await tx.cassinoRodada.create({ data: { saveId: save.id, estado: state } });
        return { rodada: publicVoltorb({ estado: state }), fichas: save.fichas - aposta };
      }, { isolationLevel: 'Serializable' });
    },
    async flipVoltorb(usuarioId, indice) {
      return db.$transaction(async (tx) => {
        const save = await saveFor(tx, usuarioId);
        const round = await tx.cassinoRodada.findUnique({ where: { saveId: save.id } });
        if (!round) throw new HttpError(409, 'Inicie uma rodada de Voltorb Flip.');
        const state = structuredClone(round.estado);
        if (state.abertas.includes(indice)) throw new HttpError(409, 'Esta casa já foi aberta.');
        const value = state.tabuleiro[indice];
        state.abertas.push(indice);
        if (value === 0) {
          await tx.cassinoRodada.delete({ where: { saveId: save.id } });
          return { resultado: 'derrota', casa: indice, valor: 0, premio: 0, fichas: save.fichas, rodada: null };
        }
        if (value > 1) { state.restantes--; state.acumulado *= value; }
        if (state.restantes === 0) {
          checkBalance(save.fichas + state.acumulado);
          await tx.save.update({ where: { id: save.id }, data: { fichas: { increment: state.acumulado } } });
          await tx.cassinoRodada.delete({ where: { saveId: save.id } });
          return { resultado: 'vitoria', casa: indice, valor: value, premio: state.acumulado, fichas: save.fichas + state.acumulado, rodada: null };
        }
        await tx.cassinoRodada.update({ where: { saveId: save.id }, data: { estado: state } });
        return { resultado: 'continua', casa: indice, valor: value, premio: 0, fichas: save.fichas, rodada: publicVoltorb({ estado: state }) };
      }, { isolationLevel: 'Serializable' });
    },
    async leaveVoltorb(usuarioId) {
      return db.$transaction(async (tx) => {
        const save = await saveFor(tx, usuarioId);
        await tx.cassinoRodada.deleteMany({ where: { saveId: save.id } });
        return { fichas: save.fichas };
      });
    },
  };
}
