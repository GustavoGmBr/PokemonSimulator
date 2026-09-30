import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';

test('MySQL: favorito persiste e só o dono pode alterá-lo', { skip: process.env.TEST_MYSQL !== '1' }, async () => {
  const db = new PrismaClient();
  const app = createApp({ db, config: parseEnv(process.env) });
  const users = [];
  try {
    for (const name of ['Owner', 'Other']) {
      const login = `fav_${randomUUID().replaceAll('-', '').slice(0, 20)}`;
      const result = (await request(app).post('/api/auth/register').send({ login, senha: 'Favorite-test-145!', nomeTreinador: name }).expect(201)).body.data;
      users.push(result);
    }
    const ownerAuth = { Authorization: `Bearer ${users[0].token}` };
    const otherAuth = { Authorization: `Bearer ${users[1].token}` };
    const original = (await request(app).get('/api/jogador/save').set(ownerAuth).expect(200)).body.data;
    const save = (await request(app).post('/api/jogador/save').set(ownerAuth).send({ nomeTreinador: 'Owner', substituirSaveId: original.id }).expect(201)).body.data;
    await request(app).post('/api/jogador/inicial').set(ownerAuth).send({ saveId: save.id, especieId: 4 }).expect(201);
    const member = (await request(app).get('/api/jogador/pokemon').set(ownerAuth).expect(200)).body.data[0];
    const endpoint = `/api/jogador/pokemon/${member.id}/favorito`;
    assert.equal(member.favorito, false);
    await request(app).patch(endpoint).set(otherAuth).send({ favorito: true }).expect(404);
    await request(app).patch(endpoint).set(ownerAuth).send({ favorito: 'sim' }).expect(400);
    assert.equal((await request(app).patch(endpoint).set(ownerAuth).send({ favorito: true }).expect(200)).body.data.favorito, true);
    assert.equal((await request(app).get('/api/jogador/pokemon').set(ownerAuth).expect(200)).body.data[0].favorito, true);
    assert.equal((await db.pokemonCapturado.findUnique({ where: { id: member.id } })).favorito, true);
    assert.equal((await request(app).patch(endpoint).set(ownerAuth).send({ favorito: false }).expect(200)).body.data.favorito, false);
  } finally {
    for (const user of users) {
      const save = await db.save.findUnique({ where: { usuarioId: user.usuario.id } });
      if (save) {
        for (const model of ['batalha', 'desafioConcluido', 'especieRegistrada', 'pokemonCapturado', 'itemInventario']) await db[model].deleteMany({ where: { saveId: save.id } });
        await db.save.delete({ where: { id: save.id } });
      }
      await db.usuario.delete({ where: { id: user.usuario.id } });
    }
    await db.$disconnect();
  }
});
