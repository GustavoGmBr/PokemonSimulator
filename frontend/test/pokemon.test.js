import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { xpProgress, nextEvolutions, evolutionRequirements, previewStats } from '../src/lib/pokemon.js';

const catalogo = JSON.parse(readFileSync(new URL('../../backend/data/catalogo.json', import.meta.url), 'utf8'));
const species = (id) => catalogo.pokemon.find((entry) => entry.id === id);

test('XP mostra progresso parcial e nao avanca alem do nivel 100', () => {
  const result = xpProgress(species(1), 5, 157);
  assert.equal(result.current, 135);
  assert.equal(result.next, 179);
  assert.equal(result.progress, 50);
  assert.equal(result.remaining, 22);
  assert.equal(xpProgress(species(1), 100, 1059860).maximum, true);
  assert.equal(xpProgress(species(1), 100, 1059860).remaining, 0);
  assert.equal(xpProgress(species(1), 5, 99999).progress, 100);
});

test('evolucao considera o estagio atual, nivel, pedra e troca', () => {
  const bulba = nextEvolutions(species(1).evolucao, 1);
  assert.equal(bulba[0].nome, 'ivysaur');
  assert.equal(evolutionRequirements(bulba[0].condicoes[0]), 'Nível 16');
  assert.deepEqual(nextEvolutions(species(3).evolucao, 3), []);
  const kadabra = nextEvolutions(species(64).evolucao, 64);
  assert.ok(kadabra[0].condicoes.some((condition) => evolutionRequirements(condition) === 'Troca'));
  const eevee = nextEvolutions(species(133).evolucao, 133);
  assert.equal(evolutionRequirements(eevee.find((entry) => entry.nome === 'vaporeon').condicoes[0]), 'Usar Pedra de Água');
});

test('condicoes compostas nao omitem periodo, amizade ou relacao de atributos', () => {
  assert.equal(evolutionRequirements({ gatilho: 'level-up', felicidade: 160, periodo: 'night' }), 'Subir de nível + Amizade ≥ 160 + Durante a noite');
  assert.match(evolutionRequirements({ gatilho: 'level-up', nivel: 20, atributosRelativos: -1 }), /Ataque < Defesa/);
  assert.equal(previewStats(species(4), 5).hp, 19);
});
