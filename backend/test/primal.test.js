import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';
import { getEspecie } from '../src/services/catalogo.js';
import { statsFor } from '../src/services/battleRules.js';

test('MySQL: Groudon e Kyogre mantêm a Regressão Primal na coleção e em batalha', { skip: process.env.TEST_MYSQL !== '1' }, async () => {
  const db = new PrismaClient();
  const app = createApp({ db, config: parseEnv(process.env) });
  const login = `primal_${randomUUID().replaceAll('-', '').slice(0, 18)}`;
  let userId;
  try {
    const account = (await request(app).post('/api/auth/register').send({ login, senha: 'Primal-test-145!', nomeTreinador: 'Primal QA' }).expect(201)).body.data;
    userId = account.usuario.id;
    const auth = { Authorization: `Bearer ${account.token}` };
    const initial = (await request(app).get('/api/jogador/save').set(auth).expect(200)).body.data;
    const save = (await request(app).post('/api/jogador/save').set(auth).send({ nomeTreinador: 'Primal QA', substituirSaveId: initial.id }).expect(201)).body.data;
    await request(app).post('/api/jogador/inicial').set(auth).send({ saveId: save.id, especieId: 4 }).expect(201);
    await db.save.update({ where: { id: save.id }, data: { moedas: 200000 } });

    for (const [speciesId, orb, formName, extraType] of [[383, 'red-orb', 'groudon-primal', 'fire'], [382, 'blue-orb', 'kyogre-primal', null]]) {
      const species = getEspecie(speciesId);
      const stats = statsFor(species, 60);
      const member = await db.pokemonCapturado.create({ data: { saveId: save.id, especieId: speciesId, nivel: 60, experiencia: species.experienciaPorNivel.find((entry) => entry.nivel === 60).experiencia, hpAtual: stats.hp, atributos: stats, shiny: false } });
      await request(app).post('/api/jogador/itens/comprar').set(auth).send({ itemId: orb }).expect(200);
      const options = (await request(app).get(`/api/jogador/pokemon/${member.id}/evolucoes`).set(auth).expect(200)).body.data;
      assert.equal(options.find((entry) => entry.alvo === formName).disponivel, true);
      const evolved = (await request(app).post(`/api/jogador/pokemon/${member.id}/evoluir`).set(auth).send({ alvo: formName }).expect(200)).body.data;
      assert.equal(evolved.megaForma, formName);
      assert.ok(evolved.atributos.attack > stats.attack);
      assert.equal(await db.itemInventario.findUnique({ where: { saveId_itemId: { saveId: save.id, itemId: orb } } }), null);
      assert.deepEqual((await request(app).get(`/api/jogador/pokemon/${member.id}/evolucoes`).set(auth).expect(200)).body.data, []);
      const battle = (await request(app).post('/api/batalhas/iniciar').set(auth).send({ tipo: 'selvagem' }).expect(201)).body.data;
      const chosen = (await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: battle.id, versao: battle.versao, acao: 'escolher', pokemonId: member.id }).expect(200)).body.data;
      assert.equal(chosen.jogador.megaForma, formName);
      assert.equal(chosen.jogador.stats.attack, evolved.atributos.attack);
      if (extraType) assert.ok(chosen.jogador.tipos.includes(extraType));
      await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: battle.id, versao: chosen.versao, acao: 'fugir' }).expect(200);
    }
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
