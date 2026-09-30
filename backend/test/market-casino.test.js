import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';
import { pokemonSaleValue } from '../src/services/market.js';
import { slotPayout, cardPayout, rouletteMultiplier } from '../src/services/casino.js';

test('preço de venda considera bola, nível, pedra, lendário e shiny', () => {
  assert.equal(pokemonSaleValue({ especieId: 25, nivel: 20, bolaCaptura: 'great-ball', shiny: false, investimentoItens: 0 }), 500);
  assert.equal(pokemonSaleValue({ especieId: 150, nivel: 60, bolaCaptura: 'master-ball', shiny: true, investimentoItens: 2000 }), 96_000);
});

test('pagamentos do cassino seguem os multiplicadores e cinco linhas', () => {
  assert.equal(slotPayout(['master-ball', 'master-ball', 'master-ball', 'blank', 'blank', 'blank', 'blank', 'blank', 'blank'], 10).premio, 1000);
  assert.equal(slotPayout(['cherry', 'blank', 'blank', 'blank', 'blank', 'blank', 'blank', 'blank', 'blank'], 10).premio, 10);
  assert.equal(cardPayout({ pokemon: 'Pikachu', numero: 4 }, { tipo: 'dupla', pokemon: 'Pikachu', numero: 3, valor: 5 }), 60);
  assert.equal(rouletteMultiplier({ pokemon: 'Pikachu', cor: 'azul' }, { tipo: 'exata', pokemon: 'Pikachu', cor: 'azul' }), 12);
  assert.equal(rouletteMultiplier({ pokemon: 'Pikachu', cor: 'azul' }, { tipo: 'cor', cor: 'verde' }), 0);
});

test('MySQL: carrinho atômico, venda, fichas, loja e aposta de Pokémon', { skip: process.env.TEST_MYSQL !== '1' }, async () => {
  const db = new PrismaClient();
  const app = createApp({ db, config: parseEnv(process.env) });
  const login = `market_${randomUUID().replaceAll('-', '').slice(0, 18)}`;
  let userId;
  try {
    const account = (await request(app).post('/api/auth/register').send({ login, senha: 'Market-test-145!', nomeTreinador: 'Market QA' }).expect(201)).body.data;
    userId = account.usuario.id;
    const auth = { Authorization: `Bearer ${account.token}` };
    const original = (await request(app).get('/api/jogador/save').set(auth).expect(200)).body.data;
    const save = (await request(app).post('/api/jogador/save').set(auth).send({ nomeTreinador: 'Market QA', substituirSaveId: original.id }).expect(201)).body.data;
    await request(app).post('/api/jogador/inicial').set(auth).send({ saveId: save.id, especieId: 4 }).expect(201);
    await db.save.update({ where: { id: save.id }, data: { moedas: 10_000 } });
    await request(app).post('/api/jogador/itens/carrinho').set(auth).send({ itens: [{ itemId: 'poke-ball', quantidade: 10 }, { itemId: 'potion', quantidade: 2 }] }).expect(200);
    assert.equal((await db.itemInventario.findUnique({ where: { saveId_itemId: { saveId: save.id, itemId: 'poke-ball' } } })).quantidade, 20);
    await request(app).post('/api/jogador/itens/carrinho').set(auth).send({ itens: [{ itemId: 'poke-ball', quantidade: 1 }, { itemId: 'master-ball', quantidade: 1 }] }).expect(400);
    assert.equal((await db.itemInventario.findUnique({ where: { saveId_itemId: { saveId: save.id, itemId: 'poke-ball' } } })).quantidade, 20);
    const extra = await db.pokemonCapturado.create({ data: { saveId: save.id, especieId: 25, nivel: 20, hpAtual: 20, bolaCaptura: 'great-ball' } });
    assert.equal((await request(app).get('/api/jogador/pokemon/valores-venda').set(auth).expect(200)).body.data.find((entry) => entry.pokemonId === extra.id).valor, 500);
    await db.pokemonCapturado.update({ where: { id: extra.id }, data: { favorito: true } });
    await request(app).post('/api/jogador/pokemon/vender').set(auth).send({ pokemonIds: [extra.id] }).expect(409);
    assert.ok(await db.pokemonCapturado.findUnique({ where: { id: extra.id } }));
    await db.pokemonCapturado.update({ where: { id: extra.id }, data: { favorito: false } });
    const sold = (await request(app).post('/api/jogador/pokemon/vender').set(auth).send({ pokemonIds: [extra.id] }).expect(200)).body.data;
    assert.equal(sold.moedasGanhas, 500);
    await request(app).post('/api/cassino/fichas').set(auth).send({ quantidade: 100 }).expect(200);
    assert.equal((await request(app).get('/api/cassino').set(auth).expect(200)).body.data.fichas, 100);
    await request(app).post('/api/cassino/itens').set(auth).send({ itens: [{ itemId: 'poke-ball', quantidade: 2 }] }).expect(200);
    assert.equal((await db.itemInventario.findUnique({ where: { saveId_itemId: { saveId: save.id, itemId: 'poke-ball' } } })).quantidade, 22);
    await db.save.update({ where: { id: save.id }, data: { fichas: 10_000 } });
    await request(app).post('/api/cassino/itens').set(auth).send({ itens: [{ itemId: 'master-ball', quantidade: 1 }] }).expect(200);
    assert.equal((await db.itemInventario.findUnique({ where: { saveId_itemId: { saveId: save.id, itemId: 'master-ball' } } })).quantidade, 1);
    const second = await db.pokemonCapturado.create({ data: { saveId: save.id, especieId: 1, nivel: 10, hpAtual: 20 } });
    await db.pokemonCapturado.update({ where: { id: second.id }, data: { favorito: true } });
    await request(app).post('/api/cassino/roleta').set(auth).send({ apostas: [], pokemonAposta: { pokemonId: second.id, tipo: 'exata', pokemon: 'Pikachu', cor: 'azul' } }).expect(409);
    assert.ok(await db.pokemonCapturado.findUnique({ where: { id: second.id } }));
    await db.pokemonCapturado.update({ where: { id: second.id }, data: { favorito: false } });
    const wager = (await request(app).post('/api/cassino/roleta').set(auth).send({ apostas: [], pokemonAposta: { pokemonId: second.id, tipo: 'exata', pokemon: 'Pikachu', cor: 'azul' } }).expect(200)).body.data;
    assert.equal(await db.pokemonCapturado.findUnique({ where: { id: second.id } }), null);
    assert.equal(wager.pokemonPremio.valorBase, 200);
    assert.ok([0, 2400].includes(wager.pokemonPremio.ganho));
    await request(app).post('/api/cassino/fichas').set(auth).send({ quantidade: 20 }).expect(200);
    await request(app).post('/api/cassino/voltorb').set(auth).send({ aposta: 5 }).expect(200);
    assert.ok((await request(app).get('/api/cassino').set(auth).expect(200)).body.data.voltorb);
    await request(app).post('/api/cassino/voltorb/desistir').set(auth).expect(200);
  } finally {
    if (userId) {
      const save = await db.save.findUnique({ where: { usuarioId: userId } });
      if (save) {
        for (const model of ['cassinoRodada', 'batalha', 'desafioConcluido', 'especieRegistrada', 'pokemonCapturado', 'itemInventario', 'batalhaEvento', 'missaoResgatada']) await db[model].deleteMany({ where: { saveId: save.id } });
        await db.save.delete({ where: { id: save.id } });
      }
      await db.usuario.delete({ where: { id: userId } });
    }
    await db.$disconnect();
  }
});

test('MySQL: treinador aceita equipe do tamanho adversário e permite trocas', { skip: process.env.TEST_MYSQL !== '1' }, async () => {
  const db = new PrismaClient();
  const app = createApp({ db, config: parseEnv(process.env) });
  const login = `party_${randomUUID().replaceAll('-', '').slice(0, 18)}`;
  let userId;
  try {
    const account = (await request(app).post('/api/auth/register').send({ login, senha: 'Party-test-145!', nomeTreinador: 'Party QA' }).expect(201)).body.data;
    userId = account.usuario.id;
    const auth = { Authorization: `Bearer ${account.token}` };
    const old = (await request(app).get('/api/jogador/save').set(auth).expect(200)).body.data;
    const save = (await request(app).post('/api/jogador/save').set(auth).send({ nomeTreinador: 'Party QA', substituirSaveId: old.id }).expect(201)).body.data;
    await request(app).post('/api/jogador/inicial').set(auth).send({ saveId: save.id, especieId: 4 }).expect(201);
    await db.pokemonCapturado.createMany({ data: [{ saveId: save.id, especieId: 1, nivel: 30, hpAtual: 80 }, { saveId: save.id, especieId: 7, nivel: 30, hpAtual: 80 }] });
    const ids = (await db.pokemonCapturado.findMany({ where: { saveId: save.id }, select: { id: true } })).map((entry) => entry.id);
    const start = (await request(app).post('/api/batalhas/iniciar').set(auth).send({ tipo: 'treinador', dificuldade: 'facil' }).expect(201)).body.data;
    assert.ok(start.totalOponentes >= 2 && start.totalOponentes <= 3);
    await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: start.id, versao: start.versao, acao: 'escolher', pokemonIds: [...ids, 'outro'] }).expect(400);
    const chosen = (await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: start.id, versao: start.versao, acao: 'escolher', pokemonIds: ids.slice(0, start.totalOponentes) }).expect(200)).body.data;
    assert.equal(chosen.reservas.length, start.totalOponentes - 1);
    const swapped = (await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: start.id, versao: chosen.versao, acao: 'trocar', pokemonId: chosen.reservas[0].pokemonId }).expect(200)).body.data;
    assert.equal(swapped.jogador.pokemonId, chosen.reservas[0].pokemonId);
    assert.ok(swapped.reservas.some((entry) => entry.pokemonId === chosen.jogador.pokemonId));
  } finally {
    if (userId) {
      const save = await db.save.findUnique({ where: { usuarioId: userId } });
      if (save) {
        for (const model of ['cassinoRodada', 'batalha', 'desafioConcluido', 'especieRegistrada', 'pokemonCapturado', 'itemInventario', 'batalhaEvento', 'missaoResgatada']) await db[model].deleteMany({ where: { saveId: save.id } });
        await db.save.delete({ where: { id: save.id } });
      }
      await db.usuario.delete({ where: { id: userId } });
    }
    await db.$disconnect();
  }
});
