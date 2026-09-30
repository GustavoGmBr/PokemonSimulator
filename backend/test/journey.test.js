import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';
import { generateMissions, missionPeriod } from '../src/services/journey.js';

test('missões são estáveis no período de duas horas e mudam no próximo', () => {
  const save = { id: 'fixed-save' };
  assert.deepEqual(generateMissions(save, [], 100), generateMissions(save, [], 100));
  assert.notDeepEqual(generateMissions(save, [], 100), generateMissions(save, [], 101));
  assert.equal(missionPeriod(2 * 60 * 60 * 1000 - 1), 0);
  assert.equal(missionPeriod(2 * 60 * 60 * 1000), 1);
});

test('MySQL: vende um ou vários, preserva o último, contabiliza missões e registra histórico', { skip: process.env.TEST_MYSQL !== '1' }, async () => {
  const db = new PrismaClient();
  const app = createApp({ db, config: parseEnv(process.env) });
  const login = `journey_${randomUUID().replaceAll('-', '').slice(0, 18)}`;
  let userId;
  try {
    const account = (await request(app).post('/api/auth/register').send({ login, senha: 'Journey-test-145!', nomeTreinador: 'Journey QA' }).expect(201)).body.data;
    userId = account.usuario.id;
    const auth = { Authorization: `Bearer ${account.token}` };
    const original = (await request(app).get('/api/jogador/save').set(auth).expect(200)).body.data;
    const save = (await request(app).post('/api/jogador/save').set(auth).send({ nomeTreinador: 'Journey QA', substituirSaveId: original.id }).expect(201)).body.data;
    await request(app).post('/api/jogador/inicial').set(auth).send({ saveId: save.id, especieId: 4 }).expect(201);
    const starter = (await request(app).get('/api/jogador/pokemon').set(auth).expect(200)).body.data[0];
    const extras = await Promise.all([1, 7].map((especieId) => db.pokemonCapturado.create({ data: { saveId: save.id, especieId, hpAtual: 20 } })));
    await db.batalha.create({ data: { saveId: save.id, estado: {} } });
    await request(app).post('/api/jogador/pokemon/vender').set(auth).send({ pokemonIds: [extras[0].id] }).expect(409);
    await db.batalha.delete({ where: { saveId: save.id } });
    await request(app).post('/api/jogador/pokemon/vender').set(auth).send({ pokemonIds: [starter.id, ...extras.map((entry) => entry.id)] }).expect(409);
    await request(app).post('/api/jogador/pokemon/vender').set(auth).send({ pokemonIds: [starter.id, 'not-owned'] }).expect(404);
    const sale = (await request(app).post('/api/jogador/pokemon/vender').set(auth).send({ pokemonIds: extras.map((entry) => entry.id) }).expect(200)).body.data;
    assert.equal(sale.vendidos, 2);
    assert.equal(sale.moedasGanhas, 300);
    assert.equal((await request(app).get('/api/jogador/pokemon').set(auth).expect(200)).body.data.length, 1);
    await request(app).post('/api/jogador/pokemon/vender').set(auth).send({ pokemonIds: [starter.id] }).expect(409);

    const missions = (await request(app).get('/api/jogador/missoes').set(auth).expect(200)).body.data;
    assert.equal(missions.missoes.length, 10);
    await db.desafioConcluido.create({ data: { saveId: save.id, desafioId: 'brock' } });
    assert.deepEqual((await request(app).get('/api/jogador/missoes').set(auth).expect(200)).body.data.missoes.map((mission) => mission.titulo), missions.missoes.map((mission) => mission.titulo));
    const capture = missions.missoes.find((mission) => mission.tipo === 'capturar');
    await request(app).post(`/api/jogador/missoes/${capture.indice}/resgatar`).set(auth).send({ periodo: missions.periodo }).expect(409);
    await db.batalhaEvento.createMany({ data: Array.from({ length: capture.alvo }, (_, index) => ({ saveId: save.id, tipo: 'capturar', regiao: capture.regiao, especieId: 25 + index, descricao: 'Pokémon capturado' })) });
    await db.batalhaEvento.create({ data: { saveId: save.id, tipo: 'shiny_encontrado', especieId: 25, regiao: capture.regiao, shiny: true, descricao: 'Pikachu shiny encontrado' } });
    await db.batalhaEvento.create({ data: { saveId: save.id, tipo: 'batalha', resultado: 'vitoria', descricao: 'Batalha vencida' } });
    assert.equal((await request(app).get('/api/jogador/missoes').set(auth).expect(200)).body.data.missoes[capture.indice].progresso, capture.alvo);
    const claimed = (await request(app).post(`/api/jogador/missoes/${capture.indice}/resgatar`).set(auth).send({ periodo: missions.periodo }).expect(200)).body.data;
    assert.deepEqual(claimed.recompensa, capture.recompensa);
    await request(app).post(`/api/jogador/missoes/${capture.indice}/resgatar`).set(auth).send({ periodo: missions.periodo }).expect(409);
    assert.equal((await db.save.findUnique({ where: { id: save.id } })).moedas, capture.recompensa.moedas + 300);
    const history = (await request(app).get('/api/jogador/historico').set(auth).expect(200)).body.data;
    assert.equal(history.resumo.capturas, capture.alvo);
    assert.equal(history.resumo.shiniesEncontrados, 1);
    assert.equal(history.resumo.vitorias, 1);
  } finally {
    if (userId) {
      const save = await db.save.findUnique({ where: { usuarioId: userId } });
      if (save) {
        for (const model of ['batalha', 'desafioConcluido', 'especieRegistrada', 'pokemonCapturado', 'itemInventario', 'batalhaEvento', 'missaoResgatada']) await db[model].deleteMany({ where: { saveId: save.id } });
        await db.save.delete({ where: { id: save.id } });
      }
      await db.usuario.delete({ where: { id: userId } });
    }
    await db.$disconnect();
  }
});
