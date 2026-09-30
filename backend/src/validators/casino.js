import { z } from 'zod';

const money = z.number().int().min(5).max(20_000_000);
const pokemon = z.enum(['Pikachu', 'Bulbasaur', 'Charmander', 'Squirtle']);
const color = z.enum(['vermelho', 'azul', 'verde']);
const casinoItems = z.array(z.object({ itemId: z.string().min(1).max(60), quantidade: z.number().int().min(1).max(999) }).strict()).min(1).max(50).refine((items) => new Set(items.map((item) => item.itemId)).size === items.length);

export const buyChipsSchema = z.object({ quantidade: z.number().int().min(1).max(20_000_000) }).strict();
export const buyCasinoItemsSchema = z.object({ itens: casinoItems }).strict();
export const casinoWagerSchema = z.object({ aposta: money }).strict();
export const cardBetsSchema = z.object({ apostas: z.array(z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('exata'), pokemon, numero: z.number().int().min(1).max(6), valor: money }).strict(),
  z.object({ tipo: z.literal('dupla'), pokemon, numero: z.number().int().min(1).max(5), valor: money }).strict(),
  z.object({ tipo: z.literal('numero'), numero: z.number().int().min(1).max(6), valor: money }).strict(),
  z.object({ tipo: z.literal('pokemon'), pokemon, valor: money }).strict(),
])).min(1).max(24) }).strict();
const rouletteBet = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('exata'), pokemon, cor: color, valor: money }).strict(),
  z.object({ tipo: z.literal('pokemon'), pokemon, valor: money }).strict(),
  z.object({ tipo: z.literal('cor'), cor: color, valor: money }).strict(),
]);
const pokemonWager = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('exata'), pokemonId: z.string().min(1).max(30), pokemon, cor: color }).strict(),
  z.object({ tipo: z.literal('pokemon'), pokemonId: z.string().min(1).max(30), pokemon }).strict(),
  z.object({ tipo: z.literal('cor'), pokemonId: z.string().min(1).max(30), cor: color }).strict(),
]);
export const rouletteSchema = z.object({ apostas: z.array(rouletteBet).max(24), pokemonAposta: pokemonWager.optional() }).strict().refine((body) => body.apostas.length > 0 || body.pokemonAposta, 'Escolha uma aposta.');
export const voltorbFlipSchema = z.object({ indice: z.number().int().min(0).max(24) }).strict();
