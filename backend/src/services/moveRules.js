import { getCatalogo } from './catalogo.js';
import { levelMovesFor } from './battleRules.js';

const HMS = new Set(['cut', 'fly', 'surf', 'strength', 'flash', 'rock-smash', 'waterfall']);

export function damagingMove(name) {
  return getCatalogo().golpes.find((move) => move.nome === name && move.poder > 0 && ['physical', 'special'].includes(move.categoria));
}

export function naturalMoves(species, level) {
  return [...new Set(species.golpesAprendidos.filter((entry) => entry.metodo === 'level-up' && entry.nivel <= level && damagingMove(entry.golpe)).map((entry) => entry.golpe))];
}

export function unlockedMoves(member, species) {
  const saved = Array.isArray(member.golpesDesbloqueados) ? member.golpesDesbloqueados : [];
  const equipped = Array.isArray(member.golpes) ? member.golpes.map((entry) => entry.nome) : [];
  return [...new Set([...saved, ...naturalMoves(species, member.nivel), ...equipped].filter((name) => damagingMove(name)))];
}

export function equippedMoves(member, species) {
  const names = Array.isArray(member.golpes) ? member.golpes.map((entry) => entry.nome) : [];
  const valid = [...new Set(names.filter((name) => damagingMove(name)))].slice(0, 4);
  return valid.length ? valid : levelMovesFor(species, member.nivel).map((move) => move.nome);
}

export function tmMoves(species) {
  return [...new Set(species.golpesAprendidos.filter((entry) => entry.metodo === 'machine' && !HMS.has(entry.golpe) && damagingMove(entry.golpe)).map((entry) => entry.golpe))]
    .map((name) => damagingMove(name)).sort((a, b) => a.nome.localeCompare(b.nome));
}

export function tmPrice(move) {
  return Math.max(1000, Math.ceil((move.poder * 20 + 500) / 100) * 100);
}
