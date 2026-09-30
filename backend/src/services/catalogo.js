import { readFileSync } from 'node:fs';
import { HttpError } from '../lib/errors.js';
import { levelMovesFor, statsFor } from './battleRules.js';
import { naturalMoves } from './moveRules.js';

let cached;
export function getCatalogo() {
  if (!cached) {
    try { cached = JSON.parse(readFileSync(new URL('../../data/catalogo.json', import.meta.url), 'utf8')); }
    catch { throw new HttpError(503, 'Catalogo indisponivel. Execute npm run catalog:import no backend.'); }
  }
  return cached;
}

export function getEspecie(id) {
  const especie = getCatalogo().pokemon.find((entry) => entry.id === Number(id));
  if (!especie) throw new HttpError(404, 'Pokemon nao encontrado.');
  return especie;
}

export function resumoEspecie(especie) {
  const { id, nome, nomeExibicao, tipos, atributosBase, sprites, formasMega, formasPrimal, formasGmax, formasFusao, altura, peso, experienciaPorNivel } = especie;
  return { id, nome, nomeExibicao, tipos, atributosBase, sprites, formasMega, formasPrimal, formasGmax, formasFusao, altura, peso, experienciaPorNivel };
}

export function getDetalhesEspecie(id) {
  const especie = getEspecie(id);
  const moves = new Map(getCatalogo().golpes.map((move) => [move.nome, move]));
  return {
    ...especie,
    golpesAprendidos: especie.golpesAprendidos.map((learned) => {
      const { tipo, categoria, poder, precisao, pp, prioridade } = moves.get(learned.golpe);
      return { ...learned, tipo, categoria, poder, precisao, pp, prioridade };
    }),
  };
}

export function criarDadosInicial(especieId) {
  const especie = getEspecie(especieId);
  const nivel = 5;
  const atributos = statsFor(especie, nivel);
  const golpes = levelMovesFor(especie, nivel).map((move) => ({ nome: move.nome }));
  return {
    especieId, nivel, experiencia: especie.experienciaPorNivel.find((entry) => entry.nivel === nivel).experiencia,
    hpAtual: atributos.hp, atributos, golpes, golpesDesbloqueados: naturalMoves(especie, nivel),
  };
}
