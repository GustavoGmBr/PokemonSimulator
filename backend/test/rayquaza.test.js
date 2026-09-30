import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';
import { getCatalogo, getEspecie } from '../src/services/catalogo.js';
import { statsFor } from '../src/services/battleRules.js';
import { evolutionOptions } from '../src/services/evolutions.js';

test('Mega Rayquazatrite está no catálogo e é exigida por Mega Rayquaza', () => {
  const item = getCatalogo().itens.find((entry) => entry.nome === 'rayquazatrite');
  assert.equal(item.nomeExibicao, 'Mega Rayquazatrite');
  assert.equal(item.precoLoja, 50000);
  assert.equal(item.sprite, '/assets/items/rayquazatrite.svg');
  assert.equal(getCatalogo().itens.some((entry) => entry.nome === 'meteorite'), false);
  assert.equal(getEspecie(384).formasMega[0].itemId, 'rayquazatrite');
  const missing = evolutionOptions({ especieId: 384, nivel: 60 }).find((entry) => entry.alvo === 'rayquaza-mega');
  assert.equal(missing.disponivel, false);
  assert.equal(evolutionOptions({ especieId: 384, nivel: 59 }, [{ itemId: 'rayquazatrite', quantidade: 1 }]).find((entry) => entry.alvo === 'rayquaza-mega').disponivel, false);
  assert.equal(evolutionOptions({ especieId: 384, nivel: 60 }, [{ itemId: 'rayquazatrite', quantidade: 1 }]).find((entry) => entry.alvo === 'rayquaza-mega').disponivel, true);
});

test('MySQL: Mega Rayquazatrite é consumida uma vez e desaparece da bolsa', { skip: process.env.TEST_MYSQL !== '1' }, async () => {
  const db = new PrismaClient();
  const app = createApp({ db, config: parseEnv(process.env) });
  const login = `rayquaza_${randomUUID().replaceAll('-', '').slice(0, 18)}`;
  let userId;
  try {
    const account = (await request(app).post('/api/auth/register').send({ login, senha: 'Rayquaza-test-145!', nomeTreinador: 'Rayquaza QA' }).expect(201)).body.data;
    userId = account.usuario.id;
    const auth = { Authorization: `Bearer ${account.token}` };
    const original = (await request(app).get('/api/jogador/save').set(auth).expect(200)).body.data;
    const save = (await request(app).post('/api/jogador/save').set(auth).send({ nomeTreinador: 'Rayquaza QA', substituirSaveId: original.id }).expect(201)).body.data;
    await request(app).post('/api/jogador/inicial').set(auth).send({ saveId: save.id, especieId: 4 }).expect(201);
    const species = getEspecie(384);
    const stats = statsFor(species, 60);
    const members = await Promise.all([0, 1].map(() => db.pokemonCapturado.create({ data: { saveId: save.id, especieId: 384, nivel: 60, experiencia: species.experienciaPorNivel.find((entry) => entry.nivel === 60).experiencia, hpAtual: stats.hp, atributos: stats } })));
    await db.save.update({ where: { id: save.id }, data: { moedas: 100000 } });
    await request(app).post('/api/jogador/itens/comprar').set(auth).send({ itemId: 'rayquazatrite' }).expect(200);
    const evolved = (await request(app).post(`/api/jogador/pokemon/${members[0].id}/evoluir`).set(auth).send({ alvo: 'rayquaza-mega' }).expect(200)).body.data;
    assert.equal(evolved.megaForma, 'rayquaza-mega');
    assert.equal(await db.itemInventario.findUnique({ where: { saveId_itemId: { saveId: save.id, itemId: 'rayquazatrite' } } }), null);
    assert.equal((await request(app).get('/api/jogador/inventario').set(auth).expect(200)).body.data.some((entry) => entry.itemId === 'rayquazatrite'), false);
    await request(app).post(`/api/jogador/pokemon/${members[1].id}/evoluir`).set(auth).send({ alvo: 'rayquaza-mega' }).expect(409);
    await request(app).post('/api/jogador/itens/comprar').set(auth).send({ itemId: 'rayquazatrite' }).expect(200);
    assert.equal((await request(app).post(`/api/jogador/pokemon/${members[1].id}/evoluir`).set(auth).send({ alvo: 'rayquaza-mega' }).expect(200)).body.data.megaForma, 'rayquaza-mega');
    assert.equal(await db.itemInventario.findUnique({ where: { saveId_itemId: { saveId: save.id, itemId: 'rayquazatrite' } } }), null);
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
