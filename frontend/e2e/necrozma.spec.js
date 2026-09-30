import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import '../../backend/src/config/env.js';
import { prisma } from '../../backend/src/lib/prisma.js';
import { getEspecie } from '../../backend/src/services/catalogo.js';
import { statsFor } from '../../backend/src/services/battleRules.js';

test.afterAll(async () => { await prisma.$disconnect(); });

test('Necrozma mostra as fusões e ativa Ultra Necrozma pela coleção', async ({ page, request }) => {
  const login = `fusion_${randomUUID().replaceAll('-', '').slice(0, 18)}`;
  let userId;
  try {
    const registered = await request.post('http://127.0.0.1:3334/api/auth/register', { data: { login, senha: 'Fusion-test-145!', nomeTreinador: 'Fusion QA' } });
    expect(registered.ok()).toBe(true);
    const { token, usuario } = (await registered.json()).data;
    userId = usuario.id;
    const headers = { Authorization: `Bearer ${token}` };
    const oldSave = (await (await request.get('http://127.0.0.1:3334/api/jogador/save', { headers })).json()).data;
    const save = (await (await request.post('http://127.0.0.1:3334/api/jogador/save', { headers, data: { nomeTreinador: 'Fusion QA', substituirSaveId: oldSave.id } })).json()).data;
    expect((await request.post('http://127.0.0.1:3334/api/jogador/inicial', { headers, data: { saveId: save.id, especieId: 722 } })).ok()).toBe(true);
    for (const especieId of [800, 791, 792]) {
      const species = getEspecie(especieId);
      const stats = statsFor(species, 60);
      await prisma.pokemonCapturado.create({ data: { saveId: save.id, especieId, nivel: 60, experiencia: species.experienciaPorNivel.find((entry) => entry.nivel === 60).experiencia, hpAtual: stats.hp, atributos: stats } });
    }
    await prisma.save.update({ where: { id: save.id }, data: { moedas: 150000 } });
    expect((await request.post('http://127.0.0.1:3334/api/jogador/itens/comprar', { headers, data: { itemId: 'ultra-burst-stone' } })).ok()).toBe(true);
    await page.goto('/login');
    await page.evaluate((session) => localStorage.setItem('pokemon-simulator-session', JSON.stringify({ state: session, version: 0 })), { token, usuario });
    await page.goto('/menu');
    await page.getByRole('button', { name: /Ver informações de Necrozma/ }).click();
    await page.getByRole('button', { name: 'Evolução' }).click();
    const ultra = page.locator('.evolution-action').filter({ hasText: 'Ultra Necrozma' });
    await expect(ultra.getByRole('img', { name: 'Ultra Necrozma' })).toBeVisible();
    await expect(ultra).toContainText('Solgaleo + Lunala');
    await expect(ultra.getByRole('button', { name: 'Fundir' })).toBeEnabled();
    await ultra.getByRole('button', { name: 'Fundir' }).click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Ultra Necrozma', level: 2 })).toBeVisible();
    await page.getByRole('button', { name: 'Fechar detalhes' }).click();
    await expect(page.getByRole('button', { name: /Ver informações de Ultra Necrozma/ })).toBeVisible();
    expect(await prisma.pokemonCapturado.count({ where: { saveId: save.id, especieId: { in: [791, 792] } } })).toBe(2);
  } finally {
    if (userId) {
      const save = await prisma.save.findUnique({ where: { usuarioId: userId } });
      if (save) {
        for (const model of ['batalha', 'desafioConcluido', 'especieRegistrada', 'pokemonCapturado', 'itemInventario']) await prisma[model].deleteMany({ where: { saveId: save.id } });
        await prisma.save.delete({ where: { id: save.id } });
      }
      await prisma.usuario.delete({ where: { id: userId } });
    }
  }
});
