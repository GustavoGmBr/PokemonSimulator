import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { parseEnv } from '../src/config/env.js';
import { createApp } from '../src/app.js';

test('MySQL: persistencia, posse, escolha concorrente e substituicao atomica do save', { skip: process.env.TEST_MYSQL !== '1' }, async () => {
  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();
  const app = createApp({ db, config: parseEnv(process.env) });
  const ids = [];
  try {
    const login = `qa_${randomUUID().replaceAll('-', '').slice(0, 20)}`;
    const account = await request(app).post('/api/auth/register').send({ login, senha: 'Test-password-135!', nomeTreinador: 'QA temporario' }).expect(201);
    ids.push(account.body.data.usuario.id);
    const headers = { Authorization: `Bearer ${account.body.data.token}` };
    const initial = await request(app).get('/api/jogador/save').set(headers).expect(200);
    assert.equal(initial.body.data.iniciadoEm, null);
    await request(app).post('/api/jogador/save').set(headers).send({ nomeTreinador: 'QA', substituirSaveId: null }).expect(409);
    const started = await request(app).post('/api/jogador/save').set(headers).send({ nomeTreinador: 'QA', substituirSaveId: initial.body.data.id }).expect(201);
    const saveId = started.body.data.id;
    assert.ok(started.body.data.iniciadoEm);
    await request(app).post('/api/jogador/inicial').set(headers).send({ saveId, especieId: 25 }).expect(400);
    const second = await request(app).post('/api/auth/register').send({ login: `${login}b`, senha: 'Test-password-135!', nomeTreinador: 'QA outro' }).expect(201);
    ids.push(second.body.data.usuario.id);
    await request(app).post('/api/jogador/inicial').set('Authorization', `Bearer ${second.body.data.token}`).send({ saveId, especieId: 1 }).expect(409);
    const attempts = await Promise.all([1, 4].map((especieId) => request(app).post('/api/jogador/inicial').set(headers).send({ saveId, especieId })));
    assert.deepEqual(attempts.map((response) => response.status).sort(), [201, 409]);
    const team = await request(app).get('/api/jogador/time').set(headers).expect(200);
    assert.equal(team.body.data.length, 1);
    assert.equal(team.body.data[0].nivel, 5);
    assert.equal(team.body.data[0].hpAtual, team.body.data[0].atributos.hp);
    assert.ok(team.body.data[0].golpes.length);
    assert.equal((await db.itemInventario.findUnique({ where: { saveId_itemId: { saveId, itemId: 'poke-ball' } } })).quantidade, 10);
    const reset = await request(app).post('/api/jogador/save').set(headers).send({ nomeTreinador: 'QA novo', substituirSaveId: saveId }).expect(201);
    assert.notEqual(reset.body.data.id, saveId);
    assert.equal(await db.pokemonCapturado.count({ where: { saveId } }), 0);
    assert.equal(await db.itemInventario.count({ where: { saveId } }), 0);
    await request(app).post('/api/jogador/inicial').set(headers).send({ saveId, especieId: 7 }).expect(409);
    await request(app).post('/api/jogador/save').set(headers).send({ nomeTreinador: 'QA repetido', substituirSaveId: saveId }).expect(409);
    const persisted = await db.save.findUnique({ where: { usuarioId: ids[0] } });
    assert.equal(persisted.id, reset.body.data.id);
    assert.equal(persisted.inicialEspecieId, null);
  } finally {
    // Remove somente os usuarios criados nesta execucao; cascatas removem seus saves.
    for (const id of ids) {
      const currentSave = await db.save.findUnique({ where: { usuarioId: id } });
      if (currentSave) {
        for (const model of ['batalha', 'desafioConcluido', 'especieRegistrada', 'pokemonCapturado', 'itemInventario']) await db[model].deleteMany({ where: { saveId: currentSave.id } });
        await db.save.delete({ where: { id: currentSave.id } });
      }
      await db.usuario.delete({ where: { id } });
    }
    await db.$disconnect();
  }
});
