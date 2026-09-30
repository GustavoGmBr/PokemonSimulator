import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import '../../backend/src/config/env.js';
import { prisma } from '../../backend/src/lib/prisma.js';
import { getEspecie } from '../../backend/src/services/catalogo.js';
import { formFor, statsFor } from '../../backend/src/services/battleRules.js';

test.afterAll(async () => { await prisma.$disconnect(); });

test('coleção filtra, ordena e salva favoritos', async ({ page, request }) => {
  const login = `collection_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
  let userId;
  try {
    const registered = await request.post('http://127.0.0.1:3334/api/auth/register', { data: { login, senha: 'Collection-test-145!', nomeTreinador: 'Collection QA' } });
    expect(registered.ok()).toBe(true);
    const { token, usuario } = (await registered.json()).data;
    userId = usuario.id;
    const headers = { Authorization: `Bearer ${token}` };
    const original = (await (await request.get('http://127.0.0.1:3334/api/jogador/save', { headers })).json()).data;
    const saveResponse = await request.post('http://127.0.0.1:3334/api/jogador/save', { headers, data: { nomeTreinador: 'Collection QA', substituirSaveId: original.id } });
    expect(saveResponse.ok(), await saveResponse.text()).toBe(true);
    const save = (await saveResponse.json()).data;
    expect((await request.post('http://127.0.0.1:3334/api/jogador/inicial', { headers, data: { saveId: save.id, especieId: 4 } })).ok()).toBe(true);
    for (const { id, level, shiny, mega, captured } of [
      { id: 152, level: 20, shiny: false, captured: '2024-01-01T12:00:00.000Z' },
      { id: 906, level: 80, shiny: true, captured: '2025-01-01T12:00:00.000Z' },
      { id: 6, level: 100, shiny: false, mega: true, captured: '2025-06-01T12:00:00.000Z' },
    ]) {
      const species = getEspecie(id);
      const megaForma = mega ? species.formasMega[0].nome : null;
      const stats = statsFor(formFor(species, megaForma), level, shiny);
      await prisma.pokemonCapturado.create({ data: { saveId: save.id, especieId: id, nivel: level, experiencia: species.experienciaPorNivel.find((entry) => entry.nivel === level).experiencia, shiny, megaForma, hpAtual: stats.hp, atributos: stats, capturadoEm: new Date(captured) } });
    }
    await page.goto('/login');
    await page.evaluate((session) => localStorage.setItem('pokemon-simulator-session', JSON.stringify({ state: session, version: 0 })), { token, usuario });
    await page.goto('/menu');
    const collection = page.locator('.team-panel');
    await expect(collection.getByText('4 de 4 Pokémon exibidos')).toBeVisible();
    await collection.getByRole('button', { name: 'Adicionar Sprigatito aos favoritos' }).click();
    await expect(collection.getByRole('button', { name: 'Remover Sprigatito dos favoritos' })).toBeVisible();
    await collection.getByRole('checkbox', { name: 'Favoritos' }).check();
    await expect(collection.getByText('1 de 4 Pokémon exibidos')).toBeVisible();
    await expect(collection.getByRole('button', { name: 'Ver informações de Sprigatito' })).toBeVisible();
    await page.reload();
    await expect(collection.getByRole('button', { name: 'Remover Sprigatito dos favoritos' })).toBeVisible();
    await collection.getByRole('combobox', { name: 'Filtrar meus Pokémon por geração' }).selectOption('9');
    await expect(collection.getByText('1 de 4 Pokémon exibidos')).toBeVisible();
    await collection.getByRole('combobox', { name: 'Filtrar meus Pokémon shiny' }).selectOption('sim');
    await expect(collection.getByRole('button', { name: 'Ver informações de Sprigatito' })).toBeVisible();
    await collection.getByRole('combobox', { name: 'Filtrar meus Pokémon por geração' }).selectOption('');
    await collection.getByRole('combobox', { name: 'Filtrar meus Pokémon shiny' }).selectOption('');
    await collection.getByRole('combobox', { name: 'Filtrar meus Pokémon por forma' }).selectOption('mega');
    await expect(collection.getByText('1 de 4 Pokémon exibidos')).toBeVisible();
    await expect(collection.getByRole('button', { name: /Ver informações de Charizard Mega/ })).toBeVisible();
    await collection.getByRole('combobox', { name: 'Filtrar meus Pokémon por forma' }).selectOption('');
    await collection.getByRole('spinbutton', { name: 'Nível mínimo' }).fill('90');
    await expect(collection.getByRole('button', { name: /Ver informações de Charizard Mega/ })).toBeVisible();
    await expect(collection.getByText('1 de 4 Pokémon exibidos')).toBeVisible();
    await collection.getByRole('spinbutton', { name: 'Nível mínimo' }).fill('');
    await collection.getByRole('combobox', { name: 'Ordenar meus Pokémon' }).selectOption('capture-old');
    await expect(collection.locator('.party-entry').first().getByRole('button', { name: 'Ver informações de Chikorita' })).toBeVisible();
    await collection.getByRole('combobox', { name: 'Ordenar meus Pokémon' }).selectOption('strength-high');
    await expect(collection.locator('.party-entry').first().getByRole('button', { name: /Ver informações de Charizard Mega/ })).toBeVisible();
    expect((await prisma.pokemonCapturado.findFirst({ where: { saveId: save.id, especieId: 906 } })).favorito).toBe(true);
    await collection.getByRole('button', { name: /Ver informações de Charizard Mega/ }).click();
    await page.getByRole('button', { name: 'Galeria de formas' }).click();
    await expect(page.locator('.form-gallery-card').filter({ hasText: 'Charizard Mega X' })).toBeVisible();
    await expect(page.locator('.form-gallery-card').filter({ hasText: 'G-Max Charizard' })).toBeVisible();
    await page.getByRole('button', { name: 'Fechar detalhes' }).click();
    await collection.getByRole('button', { name: 'Loja de Pokémon · vender' }).click();
    await expect(collection.getByRole('button', { name: /Favorito protegido Sprigatito/ })).toBeDisabled();
    await collection.getByRole('button', { name: 'Selecionar Chikorita' }).click();
    await collection.getByRole('button', { name: /Vender 1 Pokémon/ }).click();
    await page.getByRole('button', { name: 'Sim, vender' }).click();
    await expect(collection.getByText('3 de 3 Pokémon exibidos')).toBeVisible();
    expect(await prisma.pokemonCapturado.count({ where: { saveId: save.id } })).toBe(3);
    await page.goto('/mercado');
    await expect(page.getByRole('heading', { name: 'Venda seus Pokémon.' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Vender 0 Pokémon/ })).toBeDisabled();
    await page.goto('/pokedex');
    await page.getByRole('textbox', { name: 'Buscar Pokémon' }).fill('Necrozma');
    await page.getByRole('button', { name: /Ver Necrozma, não capturado/ }).click();
    await page.getByRole('button', { name: 'Galeria de formas' }).click();
    await expect(page.locator('.form-gallery-card').filter({ hasText: 'Necrozma Juba Crepúsculo' })).toBeVisible();
    await expect(page.locator('.form-gallery-card').filter({ hasText: 'Ultra Necrozma' })).toContainText('Pedra Ultra Burst');
    await page.goto('/missoes');
    await expect(page.getByRole('heading', { name: 'Missões da jornada' })).toBeVisible();
    await expect(page.locator('.mission-card')).toHaveCount(10);
    await expect(page.getByRole('timer', { name: 'Tempo até o reset das missões' })).toHaveText(/^\d{2}:\d{2}:\d{2}$/);
    await expect(page.getByRole('button', { name: 'Receber todas as recompensas (0)' })).toBeDisabled();
    const missions = (await (await request.get('http://127.0.0.1:3334/api/jogador/missoes', { headers })).json()).data.missoes;
    const captureMission = missions.find((mission) => mission.tipo === 'capturar');
    const defeatMission = missions.find((mission) => mission.tipo === 'derrotar');
    await prisma.batalhaEvento.createMany({ data: [
      ...Array.from({ length: captureMission.alvo }, (_, index) => ({ saveId: save.id, tipo: 'capturar', regiao: captureMission.regiao, especieId: 25 + index, descricao: 'Captura de teste' })),
      ...Array.from({ length: defeatMission.alvo }, (_, index) => ({ saveId: save.id, tipo: 'derrotar', regiao: defeatMission.regiao, especieId: 50 + index, descricao: 'Vitória de teste' })),
    ] });
    await page.reload();
    await page.getByRole('button', { name: 'Receber todas as recompensas (2)' }).click();
    await expect(page.getByRole('button', { name: 'Receber todas as recompensas (0)' })).toBeDisabled();
    expect(await prisma.missaoResgatada.count({ where: { saveId: save.id } })).toBe(2);
    expect((await prisma.save.findUnique({ where: { id: save.id } })).moedas).toBe(captureMission.recompensa.moedas + defeatMission.recompensa.moedas + 300);
    await page.goto('/perfil');
    await expect(page.getByRole('heading', { name: 'Histórico de batalha e captura' })).toBeVisible();
    await page.goto('/selvagens');
    await page.getByRole('button', { name: 'Procurar Pokémon' }).click();
    await expect(page.locator('.battle-matchup')).toHaveCount(3);
    await expect(page.locator('.battle-matchup').first()).toContainText('Ataque ×');
  } finally {
    if (userId) {
      const save = await prisma.save.findUnique({ where: { usuarioId: userId } });
      if (save) {
        for (const model of ['batalha', 'desafioConcluido', 'especieRegistrada', 'pokemonCapturado', 'itemInventario', 'batalhaEvento', 'missaoResgatada']) await prisma[model].deleteMany({ where: { saveId: save.id } });
        await prisma.save.delete({ where: { id: save.id } });
      }
      await prisma.usuario.delete({ where: { id: userId } });
    }
  }
});
