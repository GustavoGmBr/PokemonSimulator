import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import '../../backend/src/config/env.js';
import { prisma } from '../../backend/src/lib/prisma.js';

test.afterAll(async () => { await prisma.$disconnect(); });

test('Pokécassino compra fichas, joga, abre Voltorb e troca fichas por itens', async ({ page, request }) => {
  const login = `casino_${randomUUID().replaceAll('-', '').slice(0, 18)}`;
  let userId;
  try {
    const registered = await request.post('http://127.0.0.1:3334/api/auth/register', { data: { login, senha: 'Casino-test-145!', nomeTreinador: 'Casino QA' } });
    expect(registered.ok()).toBe(true);
    const { token, usuario } = (await registered.json()).data;
    userId = usuario.id;
    const headers = { Authorization: `Bearer ${token}` };
    const original = (await (await request.get('http://127.0.0.1:3334/api/jogador/save', { headers })).json()).data;
    const saved = await request.post('http://127.0.0.1:3334/api/jogador/save', { headers, data: { nomeTreinador: 'Casino QA', substituirSaveId: original.id } });
    expect(saved.ok()).toBe(true);
    const save = (await saved.json()).data;
    expect((await request.post('http://127.0.0.1:3334/api/jogador/inicial', { headers, data: { saveId: save.id, especieId: 4 } })).ok()).toBe(true);
    await prisma.save.update({ where: { id: save.id }, data: { moedas: 100_000 } });
    const wagered = await prisma.pokemonCapturado.create({ data: { saveId: save.id, especieId: 25, nivel: 20, hpAtual: 35, bolaCaptura: 'great-ball' } });
    const favorite = await prisma.pokemonCapturado.create({ data: { saveId: save.id, especieId: 1, nivel: 10, hpAtual: 30, favorito: true } });
    await page.goto('/login');
    await page.evaluate((session) => localStorage.setItem('pokemon-simulator-session', JSON.stringify({ state: session, version: 0 })), { token, usuario });
    await page.goto('/cassino');
    await expect(page.getByRole('heading', { name: 'A sorte está lançada.' })).toBeVisible();
    await page.getByRole('spinbutton', { name: 'Comprar fichas · 5 ₽ cada' }).fill('1000');
    await page.getByRole('button', { name: 'Comprar · 5.000 ₽' }).click();
    await expect(page.locator('.casino-wallet')).toContainText('1.000');
    await page.getByRole('button', { name: 'Girar', exact: true }).click();
    await expect(page.locator('.casino-slots > div')).toHaveCount(9);
    await page.getByRole('tab', { name: 'Cartas' }).click();
    await page.getByRole('button', { name: 'Adicionar palpite' }).click();
    await page.getByRole('button', { name: /Virar carta/ }).click();
    await expect(page.locator('.casino-result')).toContainText('Carta');
    await page.getByRole('tab', { name: 'Roleta' }).click();
    await expect(page.locator('.casino-wager-grid img')).toHaveCount(3);
    await expect(page.getByRole('button', { name: /Favorito protegido Bulbasaur/ })).toBeDisabled();
    await page.getByRole('searchbox', { name: 'Buscar por nome ou Nº Dex' }).fill('Pikachu');
    await page.getByRole('spinbutton', { name: 'Valor mínimo (₽)' }).fill('400');
    await page.getByRole('spinbutton', { name: 'Valor máximo (₽)' }).fill('550');
    await expect(page.locator('.casino-wager-count')).toContainText('1 de 3');
    const pikachu = page.getByRole('button', { name: /Apostar Pikachu/ });
    await expect(pikachu.locator('img')).toHaveAttribute('src', /25-front\.png/);
    await pikachu.click();
    await expect(pikachu).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('searchbox', { name: 'Buscar por nome ou Nº Dex' }).fill('');
    await page.getByRole('spinbutton', { name: 'Valor mínimo (₽)' }).fill('');
    await page.getByRole('spinbutton', { name: 'Valor máximo (₽)' }).fill('');
    await page.getByRole('button', { name: 'Adicionar aposta' }).click();
    await page.getByRole('button', { name: /Girar roleta/ }).click();
    await expect(page.locator('.casino-result')).toContainText('fichas');
    expect(await prisma.pokemonCapturado.findUnique({ where: { id: wagered.id } })).toBeNull();
    expect((await prisma.pokemonCapturado.findUnique({ where: { id: favorite.id } })).favorito).toBe(true);
    await page.getByRole('tab', { name: 'Voltorb Flip' }).click();
    await page.getByRole('button', { name: 'Iniciar rodada' }).click();
    await expect(page.locator('.voltorb-row')).toHaveCount(6);
    await page.getByRole('button', { name: 'Desistir e perder a entrada' }).click();
    await page.getByRole('tab', { name: 'Loja de fichas' }).click();
    const ball = page.locator('.casino-items > div').filter({ hasText: 'Poké Bola' }).first();
    await ball.getByRole('spinbutton', { name: 'Quantidade' }).fill('2');
    await page.getByRole('button', { name: 'Comprar itens' }).click();
    await expect(page.locator('.casino-page')).toContainText('Compras selecionadas: 0');
    expect((await prisma.itemInventario.findUnique({ where: { saveId_itemId: { saveId: save.id, itemId: 'poke-ball' } } })).quantidade).toBe(12);
  } finally {
    if (userId) {
      const save = await prisma.save.findUnique({ where: { usuarioId: userId } });
      if (save) {
        for (const model of ['cassinoRodada', 'batalha', 'desafioConcluido', 'especieRegistrada', 'pokemonCapturado', 'itemInventario', 'batalhaEvento', 'missaoResgatada']) await prisma[model].deleteMany({ where: { saveId: save.id } });
        await prisma.save.delete({ where: { id: save.id } });
      }
      await prisma.usuario.delete({ where: { id: userId } });
    }
  }
});
