import { z } from 'zod';
export const expCandySchema = z.object({ itemId: z.enum(['exp-candy-p', 'exp-candy-m', 'exp-candy-g', 'exp-candy-gg']) }).strict();
import { nomeTreinador } from './auth.js';

export const novoSaveSchema = z.object({
  nomeTreinador,
  substituirSaveId: z.string().min(1).max(30).nullable(),
}).strict();
export const inicialSchema = z.object({
  saveId: z.string().min(1).max(30),
  especieId: z.union([1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501, 650, 653, 656, 722, 725, 728, 810, 813, 816, 906, 909, 912].map((id) => z.literal(id))),
}).strict();
export const evolveSchema = z.object({ alvo: z.union([z.number().int().min(1).max(1025), z.string().min(1).max(60)]) }).strict();
export const buyItemSchema = z.object({ itemId: z.string().min(1).max(60) }).strict();
export const buyCartSchema = z.object({ itens: z.array(z.object({ itemId: z.string().min(1).max(60), quantidade: z.number().int().min(1).max(999) }).strict()).min(1).max(100).refine((items) => new Set(items.map((item) => item.itemId)).size === items.length, 'Itens repetidos no carrinho.') }).strict();
export const equipMovesSchema = z.object({ golpes: z.array(z.string().min(1).max(80)).min(1).max(4).refine((names) => new Set(names).size === names.length) }).strict();
export const buyTmSchema = z.object({ golpe: z.string().min(1).max(80) }).strict();
export const favoriteSchema = z.object({ favorito: z.boolean() }).strict();
export const sellPokemonSchema = z.object({ pokemonIds: z.array(z.string().min(1).max(30)).min(1).max(5000).refine((ids) => new Set(ids).size === ids.length, 'Selecione Pokémon diferentes.') }).strict();
export const claimMissionSchema = z.object({ periodo: z.number().int().nonnegative() }).strict();
