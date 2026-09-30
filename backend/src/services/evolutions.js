import { HttpError } from '../lib/errors.js';
import { getCatalogo, getEspecie } from './catalogo.js';
import { formFor, statsFor } from './battleRules.js';
import { EXP_CANDIES, PASSIVE_ITEMS, REWARD_ONLY_ITEMS } from './itemRules.js';
import { naturalMoves, unlockedMoves } from './moveRules.js';

function nodeFor(root, id) {
  if (root.especieId === id) return root;
  for (const child of root.evolucoes) {
    const found = nodeFor(child, id);
    if (found) return found;
  }
  return null;
}

function optionForCondition(target, condition, level, quantities, equippedMoves) {
  let itemId = null;
  let knownMove = null;
  let requisito;
  let requiredLevel = condition.nivel;
  if (condition.gatilho === 'level-up' && (condition.nivel || condition.felicidade || condition.beleza || condition.afeto) && !condition.item && !condition.itemSegurado && !condition.local && !condition.golpeConhecido && !condition.especieNoTime) {
    if (condition.felicidade || condition.beleza || condition.afeto) requiredLevel = Math.max(30, requiredLevel ?? 0);
    requisito = condition.felicidade ? `Nível ${requiredLevel} (amizade simplificada${condition.periodo ? ` · ${condition.periodo}` : ''})` : condition.beleza ? `Nível ${requiredLevel} (beleza simplificada)` : condition.afeto ? `Nível ${requiredLevel} (afeto simplificado)` : `Nível ${requiredLevel}`;
  }
  else if (condition.gatilho === 'use-item' && condition.item) { itemId = condition.item; requisito = `Usar ${getCatalogo().itens.find((item) => item.nome === itemId)?.nomeExibicao ?? itemId}`; }
  else if (condition.gatilho === 'level-up' && condition.itemSegurado) { itemId = condition.itemSegurado; requiredLevel = 30; requisito = `Nível 30 + ${getCatalogo().itens.find((item) => item.nome === itemId)?.nomeExibicao ?? itemId}${condition.periodo ? ` (${condition.periodo})` : ''} (regra simplificada)`; }
  else if (condition.gatilho === 'level-up' && condition.golpeConhecido) { knownMove = condition.golpeConhecido; requisito = `Ter ${knownMove} entre os quatro golpes equipados`; }
  else if (condition.gatilho === 'trade' && !condition.itemSegurado && !condition.especieNaTroca) { itemId = 'linking-cord'; requisito = 'Usar Cabo de Ligação (troca single-player)'; }
  else if (condition.gatilho === 'trade' && condition.especieNaTroca) { itemId = 'linking-cord'; requisito = `Usar Cabo de Ligação (troca com ${condition.especieNaTroca} simplificada)`; }
  else if (condition.gatilho === 'trade' && condition.itemSegurado && !condition.especieNaTroca) { itemId = condition.itemSegurado; requisito = `Usar ${getCatalogo().itens.find((item) => item.nome === itemId)?.nomeExibicao ?? itemId} (troca single-player)`; }
  else return { tipo: 'normal', alvo: target.especieId, nome: target.nome, requisito: 'Condição especial ainda não disponível', disponivel: false, motivo: 'Esta condição de evolução ainda não foi implementada.' };
  const available = (requiredLevel == null || level >= requiredLevel) && (!knownMove || equippedMoves.has(knownMove)) && (!itemId || (quantities.get(itemId) ?? 0) > 0);
  return { tipo: 'normal', alvo: target.especieId, nome: getEspecie(target.especieId).nomeExibicao, requisito, itemId, quantidade: itemId ? quantities.get(itemId) ?? 0 : null, disponivel: available,
    motivo: available ? null : requiredLevel != null && level < requiredLevel ? `Alcance o nível ${requiredLevel}.` : knownMove && !equippedMoves.has(knownMove) ? `Equipe ${knownMove} antes de evoluir.` : itemId ? `Você precisa de ${getCatalogo().itens.find((item) => item.nome === itemId)?.nomeExibicao ?? itemId}.` : 'Requisito não atendido.' };
}

export function evolutionOptions(member, inventory = [], ownedSpeciesIds = []) {
  const species = getEspecie(member.especieId);
  const upgradeableFusion = species.id === 800 && ['necrozma-dusk', 'necrozma-dawn'].includes(member.megaForma);
  if (member.gmaxForma || (member.megaForma && !upgradeableFusion)) return [];
  const quantities = new Map(inventory.map((entry) => [entry.itemId, entry.quantidade]));
  const owned = new Set(ownedSpeciesIds);
  const equippedMoves = new Set(Array.isArray(member.golpes) ? member.golpes.map((entry) => entry.nome) : []);
  const current = nodeFor(species.evolucao, species.id);
  const options = [];
  for (const target of current?.evolucoes ?? []) {
    if (!getCatalogo().pokemon.some((entry) => entry.id === target.especieId)) continue;
    const variants = target.condicoes.map((condition) => optionForCondition(target, condition, member.nivel, quantities, equippedMoves));
    options.push(variants.find((option) => option.disponivel) ?? variants[0]);
  }
  for (const form of species.formasMega ?? []) {
    const enoughLevel = member.nivel >= 60;
    const enoughStone = (quantities.get(form.itemId) ?? 0) > 0;
    options.push({ tipo: 'mega', alvo: form.nome, nome: form.nomeExibicao, requisito: `Nível 60 + ${getCatalogo().itens.find((item) => item.nome === form.itemId)?.nomeExibicao ?? form.itemId}`,
      itemId: form.itemId, quantidade: quantities.get(form.itemId) ?? 0, disponivel: enoughLevel && enoughStone,
      motivo: !enoughLevel ? 'Alcance o nível 60.' : !enoughStone ? 'Você precisa da Mega Pedra correspondente.' : null });
  }
  for (const form of species.formasPrimal ?? []) {
    const enoughLevel = member.nivel >= 60;
    const enoughOrb = (quantities.get(form.itemId) ?? 0) > 0;
    options.push({ tipo: 'primal', alvo: form.nome, nome: form.nomeExibicao, requisito: `Nível 60 + ${getCatalogo().itens.find((item) => item.nome === form.itemId)?.nomeExibicao ?? form.itemId}`,
      itemId: form.itemId, quantidade: quantities.get(form.itemId) ?? 0, disponivel: enoughLevel && enoughOrb,
      motivo: !enoughLevel ? 'Alcance o nível 60.' : !enoughOrb ? 'Você precisa do Orbe correspondente.' : null });
  }
  for (const form of species.formasGmax ?? []) {
    const quantity = quantities.get('gmax-stone') ?? 0;
    options.push({ tipo: 'gmax', alvo: form.nome, nome: form.nomeExibicao, requisito: 'Pedra G-Max universal', itemId: 'gmax-stone', quantidade: quantity, disponivel: quantity > 0,
      motivo: quantity > 0 ? null : 'Você precisa de uma Pedra G-Max.' });
  }
  for (const form of species.formasFusao ?? []) {
    if (upgradeableFusion && form.nome !== 'necrozma-ultra') continue;
    const missing = form.parceiros.filter((id) => !owned.has(id));
    const hasStone = !form.itemId || (quantities.get(form.itemId) ?? 0) > 0;
    const partners = form.parceiros.map((id) => getEspecie(id).nomeExibicao).join(' + ');
    options.push({ tipo: 'fusao', alvo: form.nome, nome: form.nomeExibicao,
      requisito: `${partners} na coleção${form.itemId ? ' + Pedra Ultra Burst' : ''}`,
      itemId: form.itemId, quantidade: form.itemId ? quantities.get(form.itemId) ?? 0 : null,
      disponivel: !missing.length && hasStone,
      motivo: missing.length ? `Capture ${missing.map((id) => getEspecie(id).nomeExibicao).join(' e ')} primeiro.` : !hasStone ? 'Você precisa da Pedra Ultra Burst.' : null });
  }
  return options;
}

function transferExperience(from, to, level, experience) {
  const oldBase = from.experienciaPorNivel.find((entry) => entry.nivel === level)?.experiencia ?? 0;
  const oldNext = from.experienciaPorNivel.find((entry) => entry.nivel === level + 1)?.experiencia ?? oldBase;
  const newBase = to.experienciaPorNivel.find((entry) => entry.nivel === level)?.experiencia ?? 0;
  const newNext = to.experienciaPorNivel.find((entry) => entry.nivel === level + 1)?.experiencia ?? newBase;
  if (level >= 100) return newBase;
  const progress = oldNext > oldBase ? Math.max(0, Math.min(0.999, (experience - oldBase) / (oldNext - oldBase))) : 0;
  return newBase + Math.floor(progress * (newNext - newBase));
}

export function createEvolutionService(db) {
  return {
    async options(usuarioId, pokemonId) {
      const member = await db.pokemonCapturado.findFirst({ where: { id: pokemonId, save: { usuarioId } } });
      if (!member) throw new HttpError(404, 'Pokémon não encontrado na sua coleção.');
      const [inventory, battle, partners] = await Promise.all([
        db.itemInventario.findMany({ where: { saveId: member.saveId } }),
        db.batalha.findUnique({ where: { saveId: member.saveId }, select: { id: true } }),
        member.especieId === 800 ? db.pokemonCapturado.findMany({ where: { saveId: member.saveId, especieId: { in: [791, 792] } }, select: { especieId: true } }) : [],
      ]);
      const options = evolutionOptions(member, inventory, partners.map((entry) => entry.especieId));
      return battle ? options.map((option) => ({ ...option, disponivel: false, motivo: 'Termine a batalha atual para evoluir.' })) : options;
    },
    async evolve(usuarioId, pokemonId, alvo) {
      return db.$transaction(async (tx) => {
        const member = await tx.pokemonCapturado.findFirst({ where: { id: pokemonId, save: { usuarioId } } });
        if (!member) throw new HttpError(404, 'Pokémon não encontrado na sua coleção.');
        if (await tx.batalha.findUnique({ where: { saveId: member.saveId }, select: { id: true } })) throw new HttpError(409, 'Termine a batalha atual para evoluir.');
        const inventory = await tx.itemInventario.findMany({ where: { saveId: member.saveId } });
        const partners = member.especieId === 800 ? await tx.pokemonCapturado.findMany({ where: { saveId: member.saveId, especieId: { in: [791, 792] } }, select: { especieId: true } }) : [];
        const option = evolutionOptions(member, inventory, partners.map((entry) => entry.especieId)).find((entry) => String(entry.alvo) === String(alvo));
        if (!option) throw new HttpError(400, 'Evolução inválida para este Pokémon.');
        if (!option.disponivel) throw new HttpError(409, option.motivo);
        if (option.itemId) {
          const used = await tx.itemInventario.updateMany({ where: { saveId: member.saveId, itemId: option.itemId, quantidade: { gt: 0 } }, data: { quantidade: { decrement: 1 } } });
          if (used.count !== 1) throw new HttpError(409, 'Item de evolução indisponível.');
          await tx.itemInventario.deleteMany({ where: { saveId: member.saveId, itemId: option.itemId, quantidade: 0 } });
        }
        const oldSpecies = getEspecie(member.especieId);
        const nextSpecies = ['mega', 'primal', 'gmax', 'fusao'].includes(option.tipo) ? oldSpecies : getEspecie(option.alvo);
        const megaForma = ['mega', 'primal', 'fusao'].includes(option.tipo) ? option.alvo : null;
        const gmaxForma = option.tipo === 'gmax' ? option.alvo : null;
        const stats = statsFor(formFor(nextSpecies, megaForma, gmaxForma), member.nivel, member.shiny);
        const oldMaxHp = member.atributos?.hp ?? statsFor(oldSpecies, member.nivel, member.shiny).hp;
        const hpAtual = member.hpAtual === 0 ? 0 : Math.max(1, Math.min(stats.hp, Math.ceil(member.hpAtual / oldMaxHp * stats.hp)));
        const updated = await tx.pokemonCapturado.update({ where: { id: member.id }, data: {
          especieId: nextSpecies.id, megaForma, gmaxForma, atributos: stats, hpAtual,
          investimentoItens: { increment: option.itemId ? getCatalogo().itens.find((item) => item.nome === option.itemId)?.precoLoja ?? 0 : 0 },
          experiencia: transferExperience(oldSpecies, nextSpecies, member.nivel, member.experiencia),
          golpesDesbloqueados: [...new Set([...unlockedMoves(member, oldSpecies), ...naturalMoves(nextSpecies, member.nivel)])],
        } });
        for (const especieId of new Set([oldSpecies.id, nextSpecies.id])) await tx.especieRegistrada.upsert({ where: { saveId_especieId: { saveId: member.saveId, especieId } }, create: { saveId: member.saveId, especieId }, update: {} });
        return updated;
      }, { isolationLevel: 'Serializable', timeout: 20_000 });
    },
    async buy(usuarioId, itemId) {
      const item = getCatalogo().itens.find((entry) => entry.nome === itemId && !REWARD_ONLY_ITEMS.has(entry.nome) && Number.isInteger(entry.precoLoja) && entry.precoLoja > 0);
      if (!item) throw new HttpError(400, 'Este item não está disponível na loja.');
      return db.$transaction(async (tx) => {
        const save = await tx.save.findUnique({ where: { usuarioId } });
        if (!save?.inicialEspecieId) throw new HttpError(409, 'Inicie sua jornada antes de comprar itens.');
        if (PASSIVE_ITEMS.has(itemId)) {
          const existing = await tx.itemInventario.findUnique({ where: { saveId_itemId: { saveId: save.id, itemId } } });
          if (existing?.quantidade > 0) throw new HttpError(409, 'Você já possui este bônus permanente.');
        }
        const paid = await tx.save.updateMany({ where: { id: save.id, moedas: { gte: item.precoLoja } }, data: { moedas: { decrement: item.precoLoja } } });
        if (paid.count !== 1) throw new HttpError(409, 'Pokédólares insuficientes.');
        let owned;
        if (PASSIVE_ITEMS.has(itemId)) {
          try { owned = await tx.itemInventario.create({ data: { saveId: save.id, itemId, quantidade: 1 } }); }
          catch (error) { if (error.code === 'P2002') throw new HttpError(409, 'Você já possui este bônus permanente.'); throw error; }
        } else owned = await tx.itemInventario.upsert({ where: { saveId_itemId: { saveId: save.id, itemId } }, create: { saveId: save.id, itemId, quantidade: 1 }, update: { quantidade: { increment: 1 } } });
        return { item: owned, moedasRestantes: save.moedas - item.precoLoja };
      }, { isolationLevel: 'Serializable', timeout: 20_000 });
    },
    async buyCart(usuarioId, entries) {
      const catalog = new Map(getCatalogo().itens.map((item) => [item.nome, item]));
      const lines = entries.map(({ itemId, quantidade }) => ({ item: catalog.get(itemId), itemId, quantidade }));
      if (lines.some(({ item, quantidade }) => !item || REWARD_ONLY_ITEMS.has(item.nome) || !Number.isInteger(item.precoLoja) || item.precoLoja <= 0 || PASSIVE_ITEMS.has(item.nome) && quantidade !== 1)) throw new HttpError(400, 'Carrinho contém item indisponível ou quantidade inválida.');
      const total = lines.reduce((sum, { item, quantidade }) => sum + item.precoLoja * quantidade, 0);
      if (!Number.isSafeInteger(total) || total > 2_000_000_000) throw new HttpError(400, 'Valor do carrinho excede o limite.');
      return db.$transaction(async (tx) => {
        const save = await tx.save.findUnique({ where: { usuarioId } });
        if (!save?.inicialEspecieId) throw new HttpError(409, 'Inicie sua jornada antes de comprar itens.');
        for (const { itemId } of lines.filter(({ itemId }) => PASSIVE_ITEMS.has(itemId))) {
          const existing = await tx.itemInventario.findUnique({ where: { saveId_itemId: { saveId: save.id, itemId } } });
          if (existing?.quantidade > 0) throw new HttpError(409, `Você já possui ${catalog.get(itemId).nomeExibicao}.`);
        }
        const paid = await tx.save.updateMany({ where: { id: save.id, moedas: { gte: total } }, data: { moedas: { decrement: total } } });
        if (paid.count !== 1) throw new HttpError(409, 'Pokédólares insuficientes.');
        for (const { itemId, quantidade } of lines) await tx.itemInventario.upsert({ where: { saveId_itemId: { saveId: save.id, itemId } }, create: { saveId: save.id, itemId, quantidade }, update: { quantidade: { increment: quantidade } } });
        return { itens: entries, total, moedasRestantes: save.moedas - total };
      }, { isolationLevel: 'Serializable', timeout: 20_000 });
    },
    async useRareCandy(usuarioId, pokemonId) {
      return db.$transaction(async (tx) => {
        const member = await tx.pokemonCapturado.findFirst({ where: { id: pokemonId, save: { usuarioId } } });
        if (!member) throw new HttpError(404, 'Pokémon não encontrado na sua coleção.');
        if (member.nivel >= 100) throw new HttpError(409, 'Este Pokémon já está no nível máximo.');
        if (await tx.batalha.findUnique({ where: { saveId: member.saveId }, select: { id: true } })) throw new HttpError(409, 'Termine a batalha atual para usar Doce Raro.');
        const consumed = await tx.itemInventario.updateMany({ where: { saveId: member.saveId, itemId: 'rare-candy', quantidade: { gt: 0 } }, data: { quantidade: { decrement: 1 } } });
        if (consumed.count !== 1) throw new HttpError(409, 'Doce Raro indisponível.');
        const species = getEspecie(member.especieId);
        const level = member.nivel + 1;
        const stats = statsFor(formFor(species, member.megaForma, member.gmaxForma), level, member.shiny);
        const oldMaxHp = member.atributos?.hp ?? statsFor(formFor(species, member.megaForma, member.gmaxForma), member.nivel, member.shiny).hp;
        const hpAtual = member.hpAtual === 0 ? 0 : Math.max(1, Math.min(stats.hp, Math.ceil(member.hpAtual / oldMaxHp * stats.hp)));
        return tx.pokemonCapturado.update({ where: { id: member.id }, data: {
          nivel: level, experiencia: species.experienciaPorNivel.find((entry) => entry.nivel === level).experiencia,
          atributos: stats, hpAtual, golpesDesbloqueados: [...new Set([...unlockedMoves(member, species), ...naturalMoves(species, level)])],
        } });
      }, { isolationLevel: 'Serializable', timeout: 20_000 });
    },
    async useExpCandy(usuarioId, pokemonId, itemId) {
      if (!Object.hasOwn(EXP_CANDIES, itemId)) throw new HttpError(400, 'Doce de EXP inválido.');
      return db.$transaction(async (tx) => {
        const member = await tx.pokemonCapturado.findFirst({ where: { id: pokemonId, save: { usuarioId } } });
        if (!member) throw new HttpError(404, 'Pokémon não encontrado na sua coleção.');
        if (member.nivel >= 100) throw new HttpError(409, 'Este Pokémon já está no nível máximo.');
        if (await tx.batalha.findUnique({ where: { saveId: member.saveId }, select: { id: true } })) throw new HttpError(409, 'Termine a batalha atual para usar Doce de EXP.');
        const consumed = await tx.itemInventario.updateMany({ where: { saveId: member.saveId, itemId, quantidade: { gt: 0 } }, data: { quantidade: { decrement: 1 } } });
        if (consumed.count !== 1) throw new HttpError(409, 'Doce de EXP indisponível.');
        const species = getEspecie(member.especieId);
        const experience = Math.min(species.experienciaPorNivel.at(-1).experiencia, member.experiencia + EXP_CANDIES[itemId]);
        const level = [...species.experienciaPorNivel].reverse().find((entry) => entry.experiencia <= experience)?.nivel ?? member.nivel;
        const stats = statsFor(formFor(species, member.megaForma, member.gmaxForma), level, member.shiny);
        const oldMaxHp = member.atributos?.hp ?? statsFor(formFor(species, member.megaForma, member.gmaxForma), member.nivel, member.shiny).hp;
        const hpAtual = member.hpAtual === 0 ? 0 : Math.max(1, Math.min(stats.hp, Math.ceil(member.hpAtual / oldMaxHp * stats.hp)));
        return tx.pokemonCapturado.update({ where: { id: member.id }, data: { nivel: level, experiencia: experience, atributos: stats, hpAtual, golpesDesbloqueados: [...new Set([...unlockedMoves(member, species), ...naturalMoves(species, level)])] } });
      }, { isolationLevel: 'Serializable', timeout: 20_000 });
    },
  };
}
