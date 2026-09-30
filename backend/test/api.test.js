import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';

const config = {
  JWT_SECRET: 'test-only-secret-with-at-least-32-characters',
  JWT_EXPIRES_IN: '1h', CORS_ORIGIN: 'http://localhost:5173',
};
let app;
let token;
let created;
let lastPokemonQuery;
let lastInventoryQuery;
let updated;
let ready = true;
const users = new Map();
const db = {
  usuario: {
    async create({ data, select }) {
      if (users.has(data.login)) throw Object.assign(new Error('duplicate'), { code: 'P2002' });
      created = data;
      const user = { id: `user-${users.size + 1}`, ...data, criadoEm: new Date() };
      users.set(data.login, user);
      return Object.fromEntries(Object.keys(select).map((key) => [key, user[key]]));
    },
    async findUnique({ where, select }) {
      const user = where.login ? users.get(where.login) : [...users.values()].find((entry) => entry.id === where.id);
      if (!user) return null;
      return select ? Object.fromEntries(Object.keys(select).map((key) => [key, user[key]])) : user;
    },
  },
  save: {
    async findUnique({ where }) { return { id: 'save-1', usuarioId: where.usuarioId, moedas: 0 }; },
    async update(query) { updated = query; return { id: 'save-1', ...query.data }; },
  },
  pokemonCapturado: { async findMany(query) { lastPokemonQuery = query; return []; } },
  itemInventario: { async findMany(query) { lastInventoryQuery = query; return []; } },
  async $queryRaw() { if (!ready) throw new Error('offline'); return [{ value: 1 }]; },
};

before(() => { app = createApp({ db, config }); });

test('cadastro normaliza login, usa hash, cria save e retorna JWT sem senha', async () => {
  const response = await request(app).post('/api/auth/register').send({
    login: '  Ash  ', senha: 'Pikachu123!', nomeTreinador: 'Ash Ketchum',
  }).expect(201);
  assert.equal(created.login, 'ash');
  assert.equal(created.save.create.nomeTreinador, 'Ash Ketchum');
  assert.equal(await bcrypt.compare('Pikachu123!', created.senhaHash), true);
  assert.equal(JSON.stringify(response.body).includes('senha'), false);
  token = response.body.data.token;
  const payload = jwt.verify(token, config.JWT_SECRET, {
    algorithms: ['HS256'], issuer: 'pokemon-simulator', audience: 'pokemon-simulator-web',
  });
  assert.equal(payload.sub, 'user-1');
  assert.ok(payload.exp > payload.iat);
});

test('cadastro duplicado retorna conflito sem expor erro do banco', async () => {
  const response = await request(app).post('/api/auth/register').send({
    login: 'ASH', senha: 'OutraSenha123', nomeTreinador: 'Ash',
  }).expect(409);
  assert.equal(response.body.error, 'Registro ja existente.');
});

test('login valido retorna token; senha incorreta e conta ausente retornam 401', async () => {
  const valid = await request(app).post('/api/auth/login').send({ login: 'Ash', senha: 'Pikachu123!' }).expect(200);
  assert.ok(valid.body.data.token);
  assert.equal(valid.body.data.usuario.senhaHash, undefined);
  const wrong = await request(app).post('/api/auth/login').send({ login: 'ash', senha: 'wrong-password' }).expect(401);
  const absent = await request(app).post('/api/auth/login').send({ login: 'misty', senha: 'wrong-password' }).expect(401);
  assert.deepEqual(wrong.body, absent.body);
});

test('validacao rejeita campos privilegiados, senha fraca e senha acima de 72 bytes', async () => {
  for (const body of [
    { login: 'brock', senha: 'valid-password', nomeTreinador: 'Brock', nivel_acesso: 99 },
    { login: 'brock', senha: '123', nomeTreinador: 'Brock' },
    { login: 'brock', senha: '🔥'.repeat(20), nomeTreinador: 'Brock' },
  ]) await request(app).post('/api/auth/register').send(body).expect(400);
});

test('rotas privadas rejeitam ausencia de token, assinatura incorreta e token expirado', async () => {
  for (const path of ['/auth/me', '/jogador/save', '/jogador/time', '/jogador/pc', '/jogador/inventario', '/jogador/pokemon', '/batalhas/desafios', '/batalhas/atual']) {
    await request(app).get(`/api${path}`).expect(401);
  }
  const expired = jwt.sign({}, config.JWT_SECRET, {
    subject: 'user-1', issuer: 'pokemon-simulator', audience: 'pokemon-simulator-web', expiresIn: -1,
  });
  const incorrect = jwt.sign({ sub: 'user-1' }, 'wrong-key');
  for (const invalid of [expired, incorrect, 'invalid']) {
    await request(app).get('/api/auth/me').set('Authorization', `Bearer ${invalid}`).expect(401);
  }
});

test('perfil nao expoe hash e usuario inexistente e rejeitado', async () => {
  const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
  assert.equal(response.body.data.login, 'ash');
  assert.equal(response.body.data.senhaHash, undefined);
  const deleted = jwt.sign({}, config.JWT_SECRET, {
    subject: 'deleted-user', issuer: 'pokemon-simulator', audience: 'pokemon-simulator-web', expiresIn: '1h',
  });
  await request(app).get('/api/auth/me').set('Authorization', `Bearer ${deleted}`).expect(401);
});

test('save, colecao, PC e inventario sempre usam a identidade autenticada', async () => {
  const header = `Bearer ${token}`;
  const save = await request(app).get('/api/jogador/save?usuarioId=user-2').set('Authorization', header).expect(200);
  assert.equal(save.body.data.usuarioId, 'user-1');
  await request(app).get('/api/jogador/time?usuarioId=user-2').set('Authorization', header).expect(200);
  assert.deepEqual(lastPokemonQuery.where, { save: { usuarioId: 'user-1' } });
  await request(app).get('/api/jogador/pc').set('Authorization', header).expect(200);
  assert.deepEqual(lastPokemonQuery.where, { save: { usuarioId: 'user-1' }, posicaoTime: null });
  await request(app).get('/api/jogador/pokemon?usuarioId=user-2').set('Authorization', header).expect(200);
  assert.deepEqual(lastPokemonQuery.where, { save: { usuarioId: 'user-1' } });
  await request(app).get('/api/jogador/inventario').set('Authorization', header).expect(200);
  assert.deepEqual(lastInventoryQuery.where.save, { usuarioId: 'user-1' });
  assert.ok(lastInventoryQuery.where.itemId.notIn.includes('ether'));
  await request(app).patch('/api/jogador/save').set('Authorization', header).send({ nomeTreinador: 'Red' }).expect(200);
  assert.deepEqual(updated, { where: { usuarioId: 'user-1' }, data: { nomeTreinador: 'Red' } });
  await request(app).patch('/api/jogador/save').set('Authorization', header).send({ nomeTreinador: 'Red', moedas: 999 }).expect(400);
});

test('API publica retorna itens e detalhes de especie sem exigir login', async () => {
  const items = await request(app).get('/api/catalogo/itens').expect(200);
  assert.equal(items.body.data.length, 145);
  const species = await request(app).get('/api/catalogo/25').expect(200);
  assert.equal(species.body.data.nomeExibicao, 'Pikachu');
  assert.ok(species.body.data.sprites.animatedShiny);
  assert.ok(species.body.data.formasMega === undefined || Array.isArray(species.body.data.formasMega));
  assert.ok(species.body.data.golpesAprendidos[0].pp > 0);
  await request(app).get('/api/catalogo/not-an-id').expect(404);
});

test('health diferencia processo online e banco indisponivel', async () => {
  await request(app).get('/api/health').expect(200);
  await request(app).get('/api/health/ready').expect(200);
  ready = false;
  await request(app).get('/api/health/ready').expect(503);
  ready = true;
});

test('JSON invalido, corpo grande e rota ausente retornam erros padronizados', async () => {
  await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad').expect(400);
  await request(app).post('/api/auth/login').send({ value: 'x'.repeat(40_000) }).expect(413);
  await request(app).get('/api/does-not-exist').expect(404);
});

test('configuracao invalida nao expoe valores secretos', () => {
  assert.throws(() => parseEnv({ DATABASE_URL: 'private-password', JWT_SECRET: 'secret' }), (error) => {
    assert.match(error.message, /DATABASE_URL/);
    assert.equal(error.message.includes('private-password'), false);
    return true;
  });
});

test('CORS permite a origem configurada e respostas privadas nao sao cacheadas', async () => {
  const response = await request(app).get('/api/auth/me')
    .set('Origin', config.CORS_ORIGIN).set('Authorization', `Bearer ${token}`).expect(200);
  assert.equal(response.headers['access-control-allow-origin'], config.CORS_ORIGIN);
  assert.equal(response.headers['cache-control'], 'no-store');
  const other = await request(app).get('/api/health').set('Origin', 'http://other.example');
  assert.notEqual(other.headers['access-control-allow-origin'], 'http://other.example');
});

test('tentativas excessivas de autenticacao recebem 429', async () => {
  let response;
  for (let i = 0; i < 21; i++) response = await request(app).post('/api/auth/login').send({});
  assert.equal(response.status, 429);
});
