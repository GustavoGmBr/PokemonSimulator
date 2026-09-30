import { randomInt } from 'node:crypto';
import { getCatalogo } from './catalogo.js';
import { wildWeight } from './battleRules.js';

export const TOURNAMENTS = [
  { id: 'muito-facil', nome: 'Muito fácil', entrada: 150, moedas: 120, minimo: 3, maximo: 3, nivelMinimo: 2, nivelMaximo: 10, premios: [['poke-ball', 2, 4], ['great-ball', 0, 2], ['exp-candy-p', 1, 3], ['exp-candy-m', 0, 1]] },
  { id: 'facil', nome: 'Fácil', entrada: 500, moedas: 400, minimo: 3, maximo: 4, nivelMinimo: 10, nivelMaximo: 30, premios: [['great-ball', 2, 4], ['ultra-ball', 0, 2], ['exp-candy-m', 2, 3], ['exp-candy-g', 0, 1]] },
  { id: 'intermediario', nome: 'Intermediário', entrada: 1500, moedas: 1200, minimo: 4, maximo: 5, nivelMinimo: 30, nivelMaximo: 50, premios: [['great-ball', 2, 4], ['ultra-ball', 1, 3], ['exp-candy-g', 2, 3], ['exp-candy-gg', 0, 1]] },
  { id: 'dificil', nome: 'Difícil', entrada: 4000, moedas: 3200, minimo: 5, maximo: 6, nivelMinimo: 50, nivelMaximo: 70, premios: [['ultra-ball', 3, 4], ['exp-candy-gg', 2, 4], ['rare-candy', 1, 2]] },
  { id: 'muito-dificil', nome: 'Muito difícil', entrada: 10000, moedas: 8000, minimo: 6, maximo: 6, nivelMinimo: 70, nivelMaximo: 99, premios: [['ultra-ball', 4, 4], ['exp-candy-gg', 3, 4], ['rare-candy', 2, 3]] },
  { id: 'copa-prime', nome: 'Copa Prime', entrada: 25000, moedas: 20000, minimo: 6, maximo: 6, nivelMinimo: 100, nivelMaximo: 100, premios: [['master-ball', 0, 1], ['ultra-ball', 4, 4], ['exp-candy-gg', 4, 4], ['rare-candy', 3, 4]] },
];

const TRAINER_NAMES = ['Treinador da Copa', 'Ace Trainer', 'Veterana', 'Domador', 'Colecionador', 'Especialista', 'Mestre Pokémon', 'Finalista'];

export function rollTournament(tier, rng = randomInt) {
  const rule = TOURNAMENTS.find((entry) => entry.id === tier);
  if (!rule) return null;
  const available = getCatalogo().pokemon.filter((entry) => {
    const total = Object.values(entry.atributosBase).reduce((sum, stat) => sum + stat, 0);
    const stage = wildWeight(entry);
    if (tier === 'muito-facil') return stage === 120 && total <= 350;
    if (tier === 'facil') return !entry.lendario && !entry.mitico && stage >= 30 && total <= 480;
    if (tier === 'intermediario') return !entry.lendario && !entry.mitico && (stage === 30 || stage === 5 || total >= 440);
    if (tier === 'dificil') return !entry.lendario && !entry.mitico && (stage === 5 || total >= 460);
    return stage === 5 || entry.lendario || entry.mitico || total >= 470;
  }).map((entry) => entry.id);
  const treinadores = Array.from({ length: 8 }, (_, round) => {
    const pool = [...available];
    const count = rng(rule.minimo, rule.maximo + 1);
    return { nome: `${TRAINER_NAMES[round]} ${round + 1}`, pokemon: Array.from({ length: count }, () => ({ id: pool.splice(rng(pool.length), 1)[0], nivel: rng(rule.nivelMinimo, rule.nivelMaximo + 1) })) };
  });
  const itens = rule.premios.map(([itemId, minimo, maximo]) => ({ itemId, quantidade: rng(minimo, maximo + 1) })).filter((entry) => entry.quantidade > 0);
  return { id: rule.id, nome: rule.nome, entrada: rule.entrada, recompensa: { moedas: rule.moedas, itens }, treinadores };
}
