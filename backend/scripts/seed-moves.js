import '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';
import { getCatalogo } from '../src/services/catalogo.js';
import { levelMovesFor } from '../src/services/battleRules.js';

const catalog = getCatalogo();
try {
  const damaging = catalog.golpes.filter((move) => move.poder > 0 && ['physical', 'special'].includes(move.categoria));
  // Reexecucao idempotente: os golpes existentes recebem seus metadados atualizados.
  for (const move of damaging) {
    const data = { nome: move.nome, tipo: move.tipo, categoria: move.categoria, poder: move.poder, precisao: move.precisao, prioridade: move.prioridade };
    await prisma.golpeBatalha.upsert({ where: { id: move.id }, create: { id: move.id, ...data }, update: data });
  }
  const movesByName = new Map(damaging.map((move) => [move.nome, move]));
  const mappings = catalog.pokemon.flatMap((species) => {
    const learned = new Map();
    for (const entry of species.golpesAprendidos) {
      if (entry.metodo !== 'level-up' || !movesByName.has(entry.golpe)) continue;
      learned.set(entry.golpe, Math.min(learned.get(entry.golpe) ?? Infinity, entry.nivel));
    }
    return [...learned].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).map(([name, level], index) => ({ especieId: species.id, posicao: index + 1, golpeId: movesByName.get(name).id, nivelAprendido: level }));
  });
  await prisma.$transaction(async (tx) => {
    await tx.especieAtaque.deleteMany({ where: { especieId: { lte: catalog.pokemon.length } } });
    await tx.especieAtaque.createMany({ data: mappings });
  }, { timeout: 30_000 });
  // Preenche apenas registros antigos sem golpes, preservando escolhas do jogador.
  let migrated = 0;
  const existing = await prisma.pokemonCapturado.findMany({ select: { id: true, especieId: true, nivel: true, golpes: true } });
  for (const pokemon of existing) {
    const species = catalog.pokemon.find((entry) => entry.id === pokemon.especieId);
    if (!species) continue;
    const next = levelMovesFor(species, pokemon.nivel, catalog).map((move) => ({ nome: move.nome }));
    if (Array.isArray(pokemon.golpes) && pokemon.golpes.length) continue;
    await prisma.pokemonCapturado.update({ where: { id: pokemon.id }, data: { golpes: next } });
    migrated++;
  }
  console.log(`${damaging.length} golpes ofensivos e ${mappings.length} atribuicoes de especie gravados; ${migrated} Pokemon existentes atualizados.`);
} finally { await prisma.$disconnect(); }
