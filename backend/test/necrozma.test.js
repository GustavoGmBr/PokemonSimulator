import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';
import { getEspecie } from '../src/services/catalogo.js';
import { formFor, statsFor } from '../src/services/battleRules.js';
import { evolutionOptions } from '../src/services/evolutions.js';

test('Necrozma exige os parceiros e a Pedra Ultra Burst para cada fusão', () => {
  const necrozma = getEspecie(800);
  assert.deepEqual(necrozma.formasFusao.map((form) => form.nome), ['necrozma-dusk', 'necrozma-dawn', 'necrozma-ultra']);
  const member = { especieId: 800, nivel: 60 };
  const option = (owned, inventory = [], current = member) => evolutionOptions(current, inventory, owned);
  assert.equal(option([]).find((entry) => entry.alvo === 'necrozma-dusk').disponivel, false);
  assert.equal(option([791]).find((entry) => entry.alvo === 'necrozma-dusk').disponivel, true);
  assert.equal(option([791]).find((entry) => entry.alvo === 'necrozma-dawn').disponivel, false);
  assert.equal(option([792]).find((entry) => entry.alvo === 'necrozma-dawn').disponivel, true);
  assert.equal(option([791, 792]).find((entry) => entry.alvo === 'necrozma-ultra').disponivel, false);
  assert.equal(option([791, 792], [{ itemId: 'ultra-burst-stone', quantidade: 1 }]).find((entry) => entry.alvo === 'necrozma-ultra').disponivel, true);
  assert.deepEqual(option([791, 792], [{ itemId: 'ultra-burst-stone', quantidade: 1 }], { ...member, megaForma: 'necrozma-dusk' }).map((entry) => entry.alvo), ['necrozma-ultra']);
  assert.deepEqual(option([791, 792], [{ itemId: 'ultra-burst-stone', quantidade: 1 }], { ...member, megaForma: 'necrozma-ultra' }), []);
  assert.deepEqual(formFor(necrozma, 'necrozma-dusk').tipos, ['psychic', 'steel']);
  assert.deepEqual(formFor(necrozma, 'necrozma-dawn').tipos, ['psychic', 'ghost']);
  assert.deepEqual(formFor(necrozma, 'necrozma-ultra').tipos, ['psychic', 'dragon']);
});

test('MySQL: fusões do Necrozma persistem, preservam parceiros e aparecem em batalha', { skip: process.env.TEST_MYSQL !== '1' }, async () => {
  const db = new PrismaClient();
  const app = createApp({ db, config: parseEnv(process.env) });
  const login = `necro_${randomUUID().replaceAll('-', '').slice(0, 18)}`;
  let userId;
  try {
    const account = (await request(app).post('/api/auth/register').send({ login, senha: 'Necrozma-test-145!', nomeTreinador: 'Necrozma QA' }).expect(201)).body.data;
    userId = account.usuario.id;
    const auth = { Authorization: `Bearer ${account.token}` };
    const initial = (await request(app).get('/api/jogador/save').set(auth).expect(200)).body.data;
    const save = (await request(app).post('/api/jogador/save').set(auth).send({ nomeTreinador: 'Necrozma QA', substituirSaveId: initial.id }).expect(201)).body.data;
    await request(app).post('/api/jogador/inicial').set(auth).send({ saveId: save.id, especieId: 722 }).expect(201);
    await db.save.update({ where: { id: save.id }, data: { moedas: 150000 } });
    const createMember = async (especieId) => {
      const species = getEspecie(especieId);
      const stats = statsFor(species, 60);
      return db.pokemonCapturado.create({ data: { saveId: save.id, especieId, nivel: 60, experiencia: species.experienciaPorNivel.find((entry) => entry.nivel === 60).experiencia, hpAtual: stats.hp, atributos: stats } });
    };
    const necrozma = await createMember(800);
    await request(app).post(`/api/jogador/pokemon/${necrozma.id}/evoluir`).set(auth).send({ alvo: 'necrozma-dusk' }).expect(409);
    const solgaleo = await createMember(791);
    let options = (await request(app).get(`/api/jogador/pokemon/${necrozma.id}/evolucoes`).set(auth).expect(200)).body.data;
    assert.equal(options.find((entry) => entry.alvo === 'necrozma-dusk').disponivel, true);
    assert.equal(options.find((entry) => entry.alvo === 'necrozma-dawn').disponivel, false);
    const dusk = (await request(app).post(`/api/jogador/pokemon/${necrozma.id}/evoluir`).set(auth).send({ alvo: 'necrozma-dusk' }).expect(200)).body.data;
    assert.equal(dusk.megaForma, 'necrozma-dusk');
    assert.ok(await db.pokemonCapturado.findUnique({ where: { id: solgaleo.id } }));
    const lunala = await createMember(792);
    await request(app).post('/api/jogador/itens/comprar').set(auth).send({ itemId: 'ultra-burst-stone' }).expect(200);
    options = (await request(app).get(`/api/jogador/pokemon/${necrozma.id}/evolucoes`).set(auth).expect(200)).body.data;
    assert.deepEqual(options.map((entry) => entry.alvo), ['necrozma-ultra']);
    assert.equal(options[0].disponivel, true);
    const ultra = (await request(app).post(`/api/jogador/pokemon/${necrozma.id}/evoluir`).set(auth).send({ alvo: 'necrozma-ultra' }).expect(200)).body.data;
    assert.equal(ultra.megaForma, 'necrozma-ultra');
    assert.equal(ultra.especieId, 800);
    assert.ok(await db.pokemonCapturado.findUnique({ where: { id: lunala.id } }));
    assert.equal(await db.pokemonCapturado.count({ where: { saveId: save.id, especieId: { in: [791, 792] } } }), 2);
    assert.equal(await db.itemInventario.findUnique({ where: { saveId_itemId: { saveId: save.id, itemId: 'ultra-burst-stone' } } }), null);
    const second = await createMember(800);
    const dawn = (await request(app).post(`/api/jogador/pokemon/${second.id}/evoluir`).set(auth).send({ alvo: 'necrozma-dawn' }).expect(200)).body.data;
    assert.equal(dawn.megaForma, 'necrozma-dawn');
    const battle = (await request(app).post('/api/batalhas/iniciar').set(auth).send({ tipo: 'selvagem' }).expect(201)).body.data;
    const chosen = (await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: battle.id, versao: battle.versao, acao: 'escolher', pokemonId: necrozma.id }).expect(200)).body.data;
    assert.equal(chosen.jogador.megaForma, 'necrozma-ultra');
    assert.deepEqual(chosen.jogador.tipos, ['psychic', 'dragon']);
    assert.equal(chosen.jogador.stats.attack, ultra.atributos.attack);
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
