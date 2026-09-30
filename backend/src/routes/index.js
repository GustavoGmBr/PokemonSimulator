import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema, updateSaveSchema } from '../validators/auth.js';
import { createAuthService } from '../services/auth.js';
import { createAuthController } from '../controllers/auth.js';
import { createJogadorService } from '../services/jogador.js';
import { createJogadorController } from '../controllers/jogador.js';
import { novoSaveSchema, inicialSchema, evolveSchema, buyItemSchema, buyCartSchema, equipMovesSchema, buyTmSchema, expCandySchema, favoriteSchema, sellPokemonSchema, claimMissionSchema } from '../validators/jogador.js';
import { getCatalogo, getDetalhesEspecie, resumoEspecie } from '../services/catalogo.js';
import { createBattleService } from '../services/battles.js';
import { startBattleSchema, battleActionSchema } from '../validators/battle.js';
import { createEvolutionService } from '../services/evolutions.js';
import { createMoveManagementService } from '../services/moveManagement.js';
import { createJourneyService } from '../services/journey.js';
import { createMarketService } from '../services/market.js';
import { createCasinoService } from '../services/casino.js';
import { buyChipsSchema, buyCasinoItemsSchema, casinoWagerSchema, cardBetsSchema, rouletteSchema, voltorbFlipSchema } from '../validators/casino.js';

export function createRouter(db, config) {
  const router = Router();
  const auth = createAuthController(createAuthService(db, config));
  const jogador = createJogadorController(createJogadorService(db));
  const battles = createBattleService(db);
  const evolutions = createEvolutionService(db);
  const moves = createMoveManagementService(db);
  const journey = createJourneyService(db);
  const market = createMarketService(db);
  const casino = createCasinoService(db);
  const requireAuth = authenticate(config);
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { success: false, error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  });

  router.get('/health', (req, res) => res.json({ success: true, data: { status: 'online' } }));
  router.get('/health/ready', async (req, res) => {
    try {
      await db.$queryRaw`SELECT 1`;
      res.json({ success: true, data: { database: 'online' } });
    } catch {
      res.status(503).json({ success: false, error: 'Banco de dados indisponivel.' });
    }
  });
  router.post('/auth/register', authLimiter, validate(registerSchema), auth.register);
  router.post('/auth/login', authLimiter, validate(loginSchema), auth.login);
  router.get('/auth/me', requireAuth, auth.me);
  router.get('/catalogo', (req, res) => res.json({ success: true, data: {
    pokemon: getCatalogo().pokemon.map(resumoEspecie), tipos: getCatalogo().tipos, regras: getCatalogo().regras,
  } }));
  router.get('/catalogo/itens', (req, res) => res.json({ success: true, data: getCatalogo().itens ?? [] }));
  router.get('/catalogo/:id', (req, res) => res.json({ success: true, data: getDetalhesEspecie(req.params.id) }));

  router.use('/jogador', requireAuth);
  router.get('/jogador/save', jogador.save);
  router.post('/jogador/save', validate(novoSaveSchema), jogador.novoSave);
  router.post('/jogador/inicial', validate(inicialSchema), jogador.inicial);
  router.patch('/jogador/save', validate(updateSaveSchema), jogador.updateSave);
  router.get('/jogador/time', jogador.time);
  router.get('/jogador/pc', jogador.pc);
  router.get('/jogador/pokemon', jogador.colecao);
  router.get('/jogador/pokemon/valores-venda', async (req, res, next) => {
    try { res.json({ success: true, data: await market.values(req.usuarioId) }); } catch (error) { next(error); }
  });
  router.post('/jogador/pokemon/vender', validate(sellPokemonSchema), async (req, res, next) => {
    try { res.json({ success: true, data: await market.sell(req.usuarioId, req.body.pokemonIds) }); } catch (error) { next(error); }
  });
  router.patch('/jogador/pokemon/:id/favorito', validate(favoriteSchema), jogador.favorito);
  router.get('/jogador/pokemon/:id/golpes', async (req, res, next) => {
    try { res.json({ success: true, data: await moves.options(req.usuarioId, req.params.id) }); } catch (error) { next(error); }
  });
  router.patch('/jogador/pokemon/:id/golpes', validate(equipMovesSchema), async (req, res, next) => {
    try { res.json({ success: true, data: await moves.equip(req.usuarioId, req.params.id, req.body.golpes) }); } catch (error) { next(error); }
  });
  router.post('/jogador/pokemon/:id/tm', validate(buyTmSchema), async (req, res, next) => {
    try { res.json({ success: true, data: await moves.buyTm(req.usuarioId, req.params.id, req.body.golpe) }); } catch (error) { next(error); }
  });
  router.get('/jogador/pokedex', async (req, res, next) => {
    try { res.json({ success: true, data: await createJogadorService(db).getDex(req.usuarioId) }); } catch (error) { next(error); }
  });
  router.get('/jogador/pokemon/:id/evolucoes', async (req, res, next) => {
    try { res.json({ success: true, data: await evolutions.options(req.usuarioId, req.params.id) }); } catch (error) { next(error); }
  });
  router.post('/jogador/pokemon/:id/evoluir', validate(evolveSchema), async (req, res, next) => {
    try { res.json({ success: true, data: await evolutions.evolve(req.usuarioId, req.params.id, req.body.alvo) }); } catch (error) { next(error); }
  });
  router.post('/jogador/pokemon/:id/doce-raro', async (req, res, next) => {
    try { res.json({ success: true, data: await evolutions.useRareCandy(req.usuarioId, req.params.id) }); } catch (error) { next(error); }
  });
  router.post('/jogador/pokemon/:id/doce-exp', validate(expCandySchema), async (req, res, next) => {
    try { res.json({ success: true, data: await evolutions.useExpCandy(req.usuarioId, req.params.id, req.body.itemId) }); } catch (error) { next(error); }
  });
  router.post('/jogador/itens/comprar', validate(buyItemSchema), async (req, res, next) => {
    try { res.json({ success: true, data: await evolutions.buy(req.usuarioId, req.body.itemId) }); } catch (error) { next(error); }
  });
  router.post('/jogador/itens/carrinho', validate(buyCartSchema), async (req, res, next) => {
    try { res.json({ success: true, data: await evolutions.buyCart(req.usuarioId, req.body.itens) }); } catch (error) { next(error); }
  });
  router.get('/jogador/inventario', jogador.inventario);
  router.get('/jogador/missoes', async (req, res, next) => {
    try { res.json({ success: true, data: await journey.missions(req.usuarioId) }); } catch (error) { next(error); }
  });
  router.post('/jogador/missoes/:indice/resgatar', validate(claimMissionSchema), async (req, res, next) => {
    try { res.json({ success: true, data: await journey.claim(req.usuarioId, req.body.periodo, Number(req.params.indice)) }); } catch (error) { next(error); }
  });
  router.get('/jogador/historico', async (req, res, next) => {
    try { res.json({ success: true, data: await journey.history(req.usuarioId) }); } catch (error) { next(error); }
  });
  router.get('/batalhas/desafios', requireAuth, async (req, res, next) => {
    try { res.json({ success: true, data: await battles.challenges(req.usuarioId) }); } catch (error) { next(error); }
  });
  router.get('/batalhas/atual', requireAuth, async (req, res, next) => {
    try { res.json({ success: true, data: await battles.current(req.usuarioId) }); } catch (error) { next(error); }
  });
  router.post('/batalhas/iniciar', requireAuth, validate(startBattleSchema), async (req, res, next) => {
    try { res.status(201).json({ success: true, data: await battles.start(req.usuarioId, req.body) }); } catch (error) { next(error); }
  });
  router.post('/batalhas/acao', requireAuth, validate(battleActionSchema), async (req, res, next) => {
    try { res.json({ success: true, data: await battles.act(req.usuarioId, req.body) }); } catch (error) { next(error); }
  });
  router.get('/cassino', requireAuth, async (req, res, next) => {
    try { res.json({ success: true, data: await casino.overview(req.usuarioId) }); } catch (error) { next(error); }
  });
  router.post('/cassino/fichas', requireAuth, validate(buyChipsSchema), async (req, res, next) => {
    try { res.json({ success: true, data: await casino.buyChips(req.usuarioId, req.body.quantidade) }); } catch (error) { next(error); }
  });
  router.post('/cassino/itens', requireAuth, validate(buyCasinoItemsSchema), async (req, res, next) => {
    try { res.json({ success: true, data: await casino.buyItems(req.usuarioId, req.body.itens) }); } catch (error) { next(error); }
  });
  router.post('/cassino/slots', requireAuth, validate(casinoWagerSchema), async (req, res, next) => {
    try { res.json({ success: true, data: await casino.slots(req.usuarioId, req.body.aposta) }); } catch (error) { next(error); }
  });
  router.post('/cassino/cartas', requireAuth, validate(cardBetsSchema), async (req, res, next) => {
    try { res.json({ success: true, data: await casino.cards(req.usuarioId, req.body.apostas) }); } catch (error) { next(error); }
  });
  router.post('/cassino/roleta', requireAuth, validate(rouletteSchema), async (req, res, next) => {
    try { res.json({ success: true, data: await casino.roulette(req.usuarioId, req.body.apostas, req.body.pokemonAposta) }); } catch (error) { next(error); }
  });
  router.post('/cassino/voltorb', requireAuth, validate(casinoWagerSchema), async (req, res, next) => {
    try { res.json({ success: true, data: await casino.startVoltorb(req.usuarioId, req.body.aposta) }); } catch (error) { next(error); }
  });
  router.post('/cassino/voltorb/virar', requireAuth, validate(voltorbFlipSchema), async (req, res, next) => {
    try { res.json({ success: true, data: await casino.flipVoltorb(req.usuarioId, req.body.indice) }); } catch (error) { next(error); }
  });
  router.post('/cassino/voltorb/desistir', requireAuth, async (req, res, next) => {
    try { res.json({ success: true, data: await casino.leaveVoltorb(req.usuarioId) }); } catch (error) { next(error); }
  });
  return router;
}
