export const statNames = { hp: 'HP', attack: 'Ataque', defense: 'Defesa', 'special-attack': 'At. especial', 'special-defense': 'Def. especial', speed: 'Velocidade' };
export const displayName = (name = '') => name.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export function ownedForm(species, member) {
  if (!species) return null;
  return [...(species.formasMega ?? []), ...(species.formasPrimal ?? []), ...(species.formasFusao ?? [])].find((form) => form.nome === member?.megaForma)
    ?? species.formasGmax?.find((form) => form.nome === member?.gmaxForma)
    ?? species;
}

export function xpProgress(species, level, experience) {
  const current = species.experienciaPorNivel.find((entry) => entry.nivel === level)?.experiencia ?? 0;
  const next = species.experienciaPorNivel.find((entry) => entry.nivel === level + 1)?.experiencia;
  const maximum = level >= 100 || next === undefined;
  return { current, next, maximum, remaining: maximum ? 0 : Math.max(0, next - experience), progress: maximum ? 100 : Math.max(0, Math.min(100, ((experience - current) / (next - current)) * 100)) };
}

export function previewStats(species, level) {
  return Object.fromEntries(Object.entries(species.atributosBase).map(([name, value]) => [name,
    Math.floor(((2 * value + 15) * level) / 100) + (name === 'hp' ? level + 10 : 5),
  ]));
}

export function nextEvolutions(node, speciesId) {
  if (node.especieId === speciesId) return node.evolucoes;
  for (const child of node.evolucoes) {
    const result = nextEvolutions(child, speciesId);
    if (result) return result;
  }
  return null;
}

export function movesKnownAtLevel(species, level) {
  const learned = new Map();
  for (const move of species.golpesAprendidos) {
    if (move.metodo !== 'level-up' || move.nivel > level || !(move.poder > 0)) continue;
    const previous = learned.get(move.golpe);
    if (!previous || move.nivel > previous.nivel) learned.set(move.golpe, move);
  }
  const result = [...learned.values()].sort((a, b) => b.nivel - a.nivel || Number(species.tipos.includes(b.tipo)) - Number(species.tipos.includes(a.tipo)) || a.golpe.localeCompare(b.golpe)).slice(0, 4);
  return result.length ? result : [{ golpe: 'struggle', tipo: 'normal', categoria: 'physical', poder: 50, precisao: null }];
}

const itemNames = { 'fire-stone': 'Pedra de Fogo', 'water-stone': 'Pedra de Água', 'thunder-stone': 'Pedra do Trovão', 'leaf-stone': 'Pedra de Folha', 'moon-stone': 'Pedra da Lua', 'sun-stone': 'Pedra do Sol', 'ice-stone': 'Pedra de Gelo', 'dusk-stone': 'Pedra do Crepúsculo', 'dawn-stone': 'Pedra da Alvorada', 'shiny-stone': 'Pedra Brilhante', 'metal-coat': 'Revestimento Metálico', 'kings-rock': 'Pedra do Rei', 'upgrade': 'Upgrade', 'linking-cord': 'Cabo de Ligação' };
export function evolutionRequirements(condition) {
  const labels = [];
  if (condition.gatilho === 'level-up') labels.push(condition.nivel ? `Nível ${condition.nivel}` : 'Subir de nível');
  else if (condition.gatilho === 'trade') labels.push('Troca');
  else if (condition.gatilho !== 'use-item') labels.push(displayName(condition.gatilho));
  if (condition.item) labels.push(`Usar ${itemNames[condition.item] ?? displayName(condition.item)}`);
  if (condition.itemSegurado) labels.push(`Segurando ${itemNames[condition.itemSegurado] ?? displayName(condition.itemSegurado)}`);
  if (condition.felicidade != null) labels.push(`Amizade ≥ ${condition.felicidade}`);
  if (condition.beleza != null) labels.push(`Beleza ≥ ${condition.beleza}`);
  if (condition.afeto != null) labels.push(`Afeto ≥ ${condition.afeto}`);
  if (condition.periodo) labels.push(({ day: 'Durante o dia', night: 'Durante a noite', dusk: 'Ao entardecer' })[condition.periodo] ?? condition.periodo);
  if (condition.genero != null) labels.push(condition.genero === 1 ? 'Fêmea' : 'Macho');
  if (condition.local) labels.push(`Local: ${displayName(condition.local)}`);
  if (condition.golpeConhecido) labels.push(`Conhecer ${displayName(condition.golpeConhecido)}`);
  if (condition.tipoGolpeConhecido) labels.push(`Conhecer golpe do tipo ${displayName(condition.tipoGolpeConhecido)}`);
  if (condition.especieNoTime) labels.push(`${displayName(condition.especieNoTime)} no time`);
  if (condition.tipoNoTime) labels.push(`Pokémon do tipo ${displayName(condition.tipoNoTime)} no time`);
  if (condition.especieNaTroca) labels.push(`Trocar por ${displayName(condition.especieNaTroca)}`);
  if (condition.atributosRelativos != null) labels.push(condition.atributosRelativos === 0 ? 'Ataque = Defesa' : condition.atributosRelativos > 0 ? 'Ataque > Defesa' : 'Ataque < Defesa');
  if (condition.chuva) labels.push('Chuva no ambiente');
  if (condition.inverterConsole) labels.push('Console invertido');
  return labels.length ? labels.join(' + ') : 'Condição não informada';
}
