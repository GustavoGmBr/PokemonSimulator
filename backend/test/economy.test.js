import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';

test('MySQL: loja, cura, Doce Raro, Lucky Egg e Amulet Coin afetam uma vitória', { skip: process.env.TEST_MYSQL !== '1' }, async () => {
  const db = new PrismaClient();
  const app = createApp({ db, config: parseEnv(process.env) });
  const login = `eco_${randomUUID().replaceAll('-', '').slice(0, 19)}`;
  let userId;
  try {
    const account = await request(app).post('/api/auth/register').send({ login, senha: 'Economy-test-145!', nomeTreinador: 'Economia QA' }).expect(201);
    userId = account.body.data.usuario.id;
    const auth = { Authorization: `Bearer ${account.body.data.token}` };
    const initial = (await request(app).get('/api/jogador/save').set(auth).expect(200)).body.data;
    const save = (await request(app).post('/api/jogador/save').set(auth).send({ nomeTreinador: 'Economia QA', substituirSaveId: initial.id }).expect(201)).body.data;
    await request(app).post('/api/jogador/inicial').set(auth).send({ saveId: save.id, especieId: 4 }).expect(201);
    await db.save.update({ where: { id: save.id }, data: { moedas: 500000 } });
    for (const itemId of ['potion', 'revive', 'lucky-egg', 'amulet-coin', 'shiny-charm', 'catching-charm']) {
      await request(app).post('/api/jogador/itens/comprar').set(auth).send({ itemId }).expect(200);
    }
    for (const itemId of ['master-ball', 'rare-candy', 'exp-candy-p', 'exp-candy-m', 'exp-candy-g', 'exp-candy-gg']) await request(app).post('/api/jogador/itens/comprar').set(auth).send({ itemId }).expect(400);
    for (const itemId of ['rare-candy', 'exp-candy-p']) await db.itemInventario.create({ data: { saveId: save.id, itemId, quantidade: 1 } });
    await request(app).post('/api/jogador/itens/comprar').set(auth).send({ itemId: 'amulet-coin' }).expect(409);
    const member = (await request(app).get('/api/jogador/pokemon').set(auth).expect(200)).body.data[0];
    const leveled = (await request(app).post(`/api/jogador/pokemon/${member.id}/doce-raro`).set(auth).expect(200)).body.data;
    assert.equal(leveled.nivel, 6);
    const expLeveled = (await request(app).post(`/api/jogador/pokemon/${member.id}/doce-exp`).set(auth).send({ itemId: 'exp-candy-p' }).expect(200)).body.data;
    assert.ok(expLeveled.experiencia > leveled.experiencia);
    assert.equal((await db.itemInventario.findUnique({ where: { saveId_itemId: { saveId: save.id, itemId: 'exp-candy-p' } } })).quantidade, 0);
    const beforeBattle = (await request(app).get('/api/jogador/save').set(auth).expect(200)).body.data.moedas;
    const encounter = (await request(app).post('/api/batalhas/iniciar').set(auth).send({ tipo: 'selvagem' }).expect(201)).body.data;
    const chosen = (await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: encounter.id, versao: 0, acao: 'escolher', pokemonId: member.id }).expect(200)).body.data;
    const setup = structuredClone(chosen);
    setup.jogador.hp = 8;
    setup.jogador.stats.defense = 999;
    setup.oponente.stats.attack = 1;
    setup.oponente.ataques = [{ nome: 'scratch', tipo: 'normal', categoria: 'physical', poder: 1, precisao: 100, prioridade: 0 }];
    await db.batalha.update({ where: { id: encounter.id }, data: { estado: setup } });
    const healed = (await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: encounter.id, versao: 1, acao: 'usar-item', itemId: 'potion' }).expect(200)).body.data;
    assert.ok(healed.jogador.hp > 8);
    assert.equal((await request(app).get('/api/jogador/inventario').set(auth).expect(200)).body.data.find((entry) => entry.itemId === 'potion').quantidade, 5);
    const finishSetup = structuredClone(healed);
    finishSetup.oponente.hp = 1;
    finishSetup.jogador.stats.speed = 999;
    finishSetup.jogador.ataques[0].poder = 10000;
    finishSetup.jogador.ataques[0].tipo = 'fire';
    finishSetup.jogador.ataques[0].precisao = 100;
    await db.batalha.update({ where: { id: encounter.id }, data: { estado: finishSetup } });
    const won = (await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: encounter.id, versao: 2, acao: 'ataque', golpe: finishSetup.jogador.ataques[0].nome }).expect(200)).body.data;
    assert.equal(won.resultado, 'vitoria');
    assert.equal(won.moedasGanhas, encounter.oponente.nivel * 20);
    assert.equal((await request(app).get('/api/jogador/save').set(auth).expect(200)).body.data.moedas, beforeBattle + won.moedasGanhas);
    assert.equal(won.xpGanho % 2, 0);
    assert.equal((await request(app).get('/api/jogador/inventario').set(auth).expect(200)).body.data.find((entry) => entry.itemId === 'poke-ball').quantidade, 10);
    const next = (await request(app).post('/api/batalhas/iniciar').set(auth).send({ tipo: 'selvagem' }).expect(201)).body.data;
    const nextChosen = (await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: next.id, versao: 0, acao: 'escolher', pokemonId: member.id }).expect(200)).body.data;
    const faintSetup = structuredClone(nextChosen);
    faintSetup.jogador.hp = 1;
    faintSetup.oponente.ataques = [{ nome: 'scratch', tipo: 'normal', categoria: 'physical', poder: 10000, precisao: 100, prioridade: 1 }];
    await db.batalha.update({ where: { id: next.id }, data: { estado: faintSetup } });
    const fainted = (await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: next.id, versao: 1, acao: 'ataque', golpe: faintSetup.jogador.ataques[0].nome }).expect(200)).body.data;
    assert.equal(fainted.aguardandoReviver, true);
    assert.equal(fainted.jogador.hp, 0);
    const revived = (await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: next.id, versao: 2, acao: 'usar-item', itemId: 'revive' }).expect(200)).body.data;
    assert.equal(revived.aguardandoReviver, false);
    assert.equal(revived.jogador.hp, Math.ceil(revived.jogador.maxHp / 2));
    await request(app).post('/api/batalhas/acao').set(auth).send({ batalhaId: next.id, versao: 3, acao: 'fugir' }).expect(200);
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
