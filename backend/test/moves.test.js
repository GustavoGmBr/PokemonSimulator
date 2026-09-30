import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';

test('MySQL: TM pertence ao Pokémon comprado, golpes equipados entram na batalha e sobrevivem ao nível', { skip: process.env.TEST_MYSQL !== '1' }, async () => {
  const db = new PrismaClient();
  const app = createApp({ db, config: parseEnv(process.env) });
  const login = `tm_${randomUUID().replaceAll('-', '').slice(0, 20)}`;
  let userId;
  try {
    const account = (await request(app).post('/api/auth/register').send({ login, senha: 'Moves-test-145!', nomeTreinador: 'Golpes QA' }).expect(201)).body.data;
    userId = account.usuario.id;
    const auth = { Authorization: `Bearer ${account.token}` };
    const original = (await request(app).get('/api/jogador/save').set(auth).expect(200)).body.data;
    const save = (await request(app).post('/api/jogador/save').set(auth).send({ nomeTreinador: 'Golpes QA', substituirSaveId: original.id }).expect(201)).body.data;
    await request(app).post('/api/jogador/inicial').set(auth).send({ saveId: save.id, especieId: 4 }).expect(201);
    const member = (await request(app).get('/api/jogador/pokemon').set(auth).expect(200)).body.data[0];
    await db.save.update({ where: { id: save.id }, data: { moedas: 10000 } });
    const options = (await request(app).get(`/api/jogador/pokemon/${member.id}/golpes`).set(auth).expect(200)).body.data;
    assert.deepEqual(options.equipados, ['scratch']);
    const tm = options.tms.find((entry) => entry.nome === 'flamethrower');
    assert.ok(tm?.preco > 0);
    await request(app).post(`/api/jogador/pokemon/${member.id}/tm`).set(auth).send({ golpe: 'surf' }).expect(400);
    const bought = (await request(app).post(`/api/jogador/pokemon/${member.id}/tm`).set(auth).send({ golpe: tm.nome }).expect(200)).body.data;
    assert.equal(bought.moedasRestantes, 10000 - tm.preco);
    await request(app).post(`/api/jogador/pokemon/${member.id}/tm`).set(auth).send({ golpe: tm.nome }).expect(409);
    await request(app).patch(`/api/jogador/pokemon/${member.id}/golpes`).set(auth).send({ golpes: ['fire-blast'] }).expect(400);
    await request(app).patch(`/api/jogador/pokemon/${member.id}/golpes`).set(auth).send({ golpes: ['scratch', 'scratch'] }).expect(400);
    const equipped = (await request(app).patch(`/api/jogador/pokemon/${member.id}/golpes`).set(auth).send({ golpes: ['flamethrower'] }).expect(200)).body.data;
    assert.deepEqual(equipped.golpes, [{ nome: 'flamethrower' }]);
    const battle = (await request(app).post('/api/batalhas/iniciar').set(auth).send({ tipo: 'selvagem' }).expect(201)).body.data;
    await request(app).patch(`/api/jogador/pokemon/${member.id}/golpes`).set(auth).send({ golpes: ['scratch'] }).expect(409);
    const chosen = (await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: battle.id, versao: 0, acao: 'escolher', pokemonId: member.id }).expect(200)).body.data;
    assert.deepEqual(chosen.jogador.ataques.map((entry) => entry.nome), ['flamethrower']);
    await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: battle.id, versao: 1, acao: 'fugir' }).expect(200);
    await db.itemInventario.create({ data: { saveId: save.id, itemId: 'rare-candy', quantidade: 1 } });
    const leveled = (await request(app).post(`/api/jogador/pokemon/${member.id}/doce-raro`).set(auth).expect(200)).body.data;
    assert.deepEqual(leveled.golpes, [{ nome: 'flamethrower' }]);
    const afterLevel = (await request(app).get(`/api/jogador/pokemon/${member.id}/golpes`).set(auth).expect(200)).body.data;
    assert.ok(afterLevel.desbloqueados.includes('flamethrower'));
    await request(app).patch(`/api/jogador/pokemon/${member.id}/golpes`).set(auth).send({ golpes: ['scratch'] }).expect(200);
    await request(app).patch(`/api/jogador/pokemon/${member.id}/golpes`).set(auth).send({ golpes: ['flamethrower'] }).expect(200);
    await db.pokemonCapturado.update({ where: { id: member.id }, data: { nivel: 16 } });
    const evolved = (await request(app).post(`/api/jogador/pokemon/${member.id}/evoluir`).set(auth).send({ alvo: 5 }).expect(200)).body.data;
    assert.equal(evolved.especieId, 5);
    assert.deepEqual(evolved.golpes, [{ nome: 'flamethrower' }]);
    const afterEvolution = (await request(app).get(`/api/jogador/pokemon/${member.id}/golpes`).set(auth).expect(200)).body.data;
    assert.ok(afterEvolution.desbloqueados.includes('flamethrower'));
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
