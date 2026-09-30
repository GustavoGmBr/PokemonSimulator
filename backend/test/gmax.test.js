import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';
import { getEspecie } from '../src/services/catalogo.js';
import { statsFor } from '../src/services/battleRules.js';

test('MySQL: Pedra G-Max transforma a forma permanentemente e entra em batalha', { skip: process.env.TEST_MYSQL !== '1' }, async () => {
  const db = new PrismaClient();
  const app = createApp({ db, config: parseEnv(process.env) });
  const login = `gmax_${randomUUID().replaceAll('-', '').slice(0, 19)}`;
  let userId;
  try {
    const account = (await request(app).post('/api/auth/register').send({ login, senha: 'Gmax-test-145!', nomeTreinador: 'GMax QA' }).expect(201)).body.data;
    userId = account.usuario.id;
    const auth = { Authorization: `Bearer ${account.token}` };
    const initial = (await request(app).get('/api/jogador/save').set(auth).expect(200)).body.data;
    const save = (await request(app).post('/api/jogador/save').set(auth).send({ nomeTreinador: 'GMax QA', substituirSaveId: initial.id }).expect(201)).body.data;
    await request(app).post('/api/jogador/inicial').set(auth).send({ saveId: save.id, especieId: 4 }).expect(201);
    const species = getEspecie(6);
    const stats = statsFor(species, 60);
    const charizard = await db.pokemonCapturado.create({ data: { saveId: save.id, especieId: 6, nivel: 60, experiencia: species.experienciaPorNivel.find((entry) => entry.nivel === 60).experiencia, hpAtual: stats.hp, atributos: stats, shiny: false } });
    await db.save.update({ where: { id: save.id }, data: { moedas: 80000 } });
    await request(app).post('/api/jogador/itens/comprar').set(auth).send({ itemId: 'gmax-stone' }).expect(200);
    assert.equal((await db.save.findUnique({ where: { id: save.id } })).moedas, 5000);
    const options = (await request(app).get(`/api/jogador/pokemon/${charizard.id}/evolucoes`).set(auth).expect(200)).body.data;
    assert.equal(options.find((entry) => entry.alvo === 'charizard-gmax').disponivel, true);
    const evolved = (await request(app).post(`/api/jogador/pokemon/${charizard.id}/evoluir`).set(auth).send({ alvo: 'charizard-gmax' }).expect(200)).body.data;
    assert.equal(evolved.gmaxForma, 'charizard-gmax');
    assert.equal(evolved.megaForma, null);
    assert.ok(evolved.atributos.hp > stats.hp);
    assert.equal(await db.itemInventario.findUnique({ where: { saveId_itemId: { saveId: save.id, itemId: 'gmax-stone' } } }), null);
    assert.deepEqual((await request(app).get(`/api/jogador/pokemon/${charizard.id}/evolucoes`).set(auth).expect(200)).body.data, []);
    const battle = (await request(app).post('/api/batalhas/iniciar').set(auth).send({ tipo: 'selvagem' }).expect(201)).body.data;
    const chosen = (await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: battle.id, versao: battle.versao, acao: 'escolher', pokemonId: charizard.id }).expect(200)).body.data;
    assert.equal(chosen.jogador.gmaxForma, 'charizard-gmax');
    assert.equal(chosen.jogador.maxHp, evolved.atributos.hp);
    await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: battle.id, versao: chosen.versao, acao: 'fugir' }).expect(200);
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
