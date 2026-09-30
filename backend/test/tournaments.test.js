import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';

test('MySQL: inscrição, oito rodadas, troca de Pokémon e prêmio do torneio', { skip: process.env.TEST_MYSQL !== '1' }, async () => {
  const db = new PrismaClient();
  const app = createApp({ db, config: parseEnv(process.env) });
  const login = `cup_${randomUUID().replaceAll('-', '').slice(0, 19)}`;
  let userId;
  try {
    const account = (await request(app).post('/api/auth/register').send({ login, senha: 'Cup-test-145!', nomeTreinador: 'Copa QA' }).expect(201)).body.data;
    userId = account.usuario.id;
    const auth = { Authorization: `Bearer ${account.token}` };
    const initial = (await request(app).get('/api/jogador/save').set(auth).expect(200)).body.data;
    const save = (await request(app).post('/api/jogador/save').set(auth).send({ nomeTreinador: 'Copa QA', substituirSaveId: initial.id }).expect(201)).body.data;
    await request(app).post('/api/jogador/inicial').set(auth).send({ saveId: save.id, especieId: 1 }).expect(201);
    const member = (await request(app).get('/api/jogador/pokemon').set(auth).expect(200)).body.data[0];
    await request(app).post('/api/batalhas/iniciar').set(auth).send({ tipo: 'torneio', torneioId: 'muito-facil' }).expect(409);
    await db.save.update({ where: { id: save.id }, data: { moedas: 1000 } });
    const started = (await request(app).post('/api/batalhas/iniciar').set(auth).send({ tipo: 'torneio', torneioId: 'muito-facil' }).expect(201)).body.data;
    assert.equal(started.torneio.rodada, 1);
    assert.equal(started.torneio.treinadores.length, 8);
    assert.equal((await db.save.findUnique({ where: { id: save.id } })).moedas, 850);
    await request(app).post('/api/batalhas/iniciar').set(auth).send({ tipo: 'torneio', torneioId: 'muito-facil' }).expect(409);
    const persisted = await db.batalha.findUnique({ where: { saveId: save.id } });
    assert.equal(started.id, persisted.id);
    assert.equal(started.versao, persisted.versao);
    let state = started;
    for (let round = 1; round <= 8; round++) {
      assert.equal(state.torneio.rodada, round);
      assert.equal(state.jogador, null);
      const chosen = await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: state.id, versao: state.versao, acao: 'escolher', pokemonId: member.id });
      assert.equal(chosen.status, 200, `rodada ${round}: ${JSON.stringify(chosen.body)}; versão ${state.versao}`);
      state = chosen.body.data;
      assert.equal(state.jogador.hp, state.jogador.maxHp);
      const setup = structuredClone(state);
      delete setup.id;
      delete setup.versao;
      setup.fila = [];
      setup.oponente.hp = 1;
      setup.oponente.tipos = ['normal'];
      setup.jogador.stats.speed = 9999;
      setup.jogador.ataques[0].poder = 10000;
      setup.jogador.ataques[0].precisao = 100;
      await db.batalha.update({ where: { id: state.id }, data: { estado: setup } });
      state = (await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: state.id, versao: state.versao, acao: 'ataque', golpe: setup.jogador.ataques[0].nome }).expect(200)).body.data;
      if (round < 8) {
        assert.equal(state.resultado, null);
        assert.equal(state.torneio.rodada, round + 1);
        assert.equal((await db.save.findUnique({ where: { id: save.id } })).moedas, 850);
      }
    }
    assert.equal(state.resultado, 'vitoria');
    assert.equal(state.moedasGanhas, 120);
    assert.equal((await db.save.findUnique({ where: { id: save.id } })).moedas, 970);
    assert.ok(state.itensGanhos.some((entry) => entry.itemId === 'exp-candy-p'));
    assert.equal(await db.batalha.findUnique({ where: { saveId: save.id } }), null);
    const owned = await db.itemInventario.findMany({ where: { saveId: save.id } });
    for (const item of state.itensGanhos) assert.equal(owned.find((entry) => entry.itemId === item.itemId).quantidade, item.quantidade + (item.itemId === 'poke-ball' ? 10 : 0));
    assert.ok((await db.pokemonCapturado.findUnique({ where: { id: member.id } })).experiencia > member.experiencia);
  } finally {
    if (userId) {
      const save = await db.save.findUnique({ where: { usuarioId: userId } });
      if (save) {
        for (const model of ['batalha', 'desafioConcluido', 'especieRegistrada', 'pokemonCapturado', 'itemInventario']) await db[model].deleteMany({ where: { saveId: save.id } });
        await db.save.delete({ where: { id: save.id } });
      }
      await db.usuario.delete({ where: { id: userId } });
    }
    await db.$disconnect();
  }
});
