export function effectiveness(attackType, defenderTypes, types) {
  const relations = types?.find((entry) => entry.nome === attackType)?.relacoesDano;
  if (!relations) return 1;
  return defenderTypes.reduce((multiplier, type) => {
    if (relations.no_damage_to.includes(type)) return 0;
    if (relations.double_damage_to.includes(type)) return multiplier * 2;
    if (relations.half_damage_to.includes(type)) return multiplier * .5;
    return multiplier;
  }, 1);
}

export function effectivenessLabel(value) {
  if (value === 0) return 'Sem efeito · ×0';
  if (value > 1) return `Super efetivo · ×${value}`;
  if (value < 1) return `Não muito efetivo · ×${value}`;
  return 'Neutro · ×1';
}
