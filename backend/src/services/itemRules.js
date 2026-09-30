export const HEALING_ITEMS = {
  potion: { amount: 20 },
  'super-potion': { amount: 50 },
  'hyper-potion': { amount: 200 },
  'max-potion': { full: true },
  'full-restore': { full: true },
  revive: { revive: .5 },
  'max-revive': { revive: 1 },
};

export const PASSIVE_ITEMS = new Set(['lucky-egg', 'amulet-coin', 'shiny-charm', 'catching-charm']);
export const EXP_CANDIES = { 'exp-candy-p': 800, 'exp-candy-m': 3000, 'exp-candy-g': 10000, 'exp-candy-gg': 30000 };
export const REWARD_ONLY_ITEMS = new Set(['master-ball', 'rare-candy', ...Object.keys(EXP_CANDIES)]);

export function generationForSpecies(speciesId) {
  if (speciesId <= 151) return 1;
  if (speciesId <= 251) return 2;
  if (speciesId <= 386) return 3;
  if (speciesId <= 493) return 4;
  if (speciesId <= 649) return 5;
  if (speciesId <= 721) return 6;
  if (speciesId <= 809) return 7;
  if (speciesId <= 905) return 8;
  return 9;
}

export function healCombatant(combatant, itemId) {
  const item = HEALING_ITEMS[itemId];
  if (!item) return null;
  if (item.revive) {
    if (combatant.hp !== 0) return null;
    const hp = Math.max(1, Math.ceil(combatant.maxHp * item.revive));
    combatant.hp = hp;
    return hp;
  }
  if (combatant.hp <= 0 || combatant.hp >= combatant.maxHp) return null;
  const before = combatant.hp;
  combatant.hp = item.full ? combatant.maxHp : Math.min(combatant.maxHp, before + item.amount);
  return combatant.hp - before;
}
