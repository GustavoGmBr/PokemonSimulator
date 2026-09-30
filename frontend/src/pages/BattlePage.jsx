import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Trophy, Sparkles, Footprints, RefreshCw, Swords } from 'lucide-react';
import { api, assetUrl } from '../lib/api';
import { useCatalogo, useColecao, useSave } from '../lib/queries';
import { displayName, ownedForm } from '../lib/pokemon';
import { PageTitle, Loading, Failure, TypeBadge, typeNames } from '../components/common';
import { SpriteControls, VariantImage } from '../components/PokemonViewer';
import { Button } from '../components/ui/button';
import { BattleSetup } from '../components/BattleSetup';
import { effectiveness, effectivenessLabel } from '../lib/effectiveness';

const ballNames = { 'poke-ball': 'Poké Bola', 'great-ball': 'Super Bola', 'ultra-ball': 'Ultra Bola', 'master-ball': 'Master Bola' };
const rewardNames = { 'rare-candy': 'Doce Raro', 'exp-candy-p': 'Doce EXP P', 'exp-candy-m': 'Doce EXP M', 'exp-candy-g': 'Doce EXP G', 'exp-candy-gg': 'Doce EXP GG' };
const healNames = { potion: 'Poção', 'super-potion': 'Superpoção', 'hyper-potion': 'Hiperpoção', 'max-potion': 'Poção Máxima', 'full-restore': 'Restauração Total', revive: 'Reviver', 'max-revive': 'Reviver Máximo' };
function Life({ name, combatant }) {
  const percent = Math.max(0, Math.min(100, combatant.hp / combatant.maxHp * 100));
  return <div className="battle-life"><div><strong>{name}{combatant.shiny ? <Sparkles size={14} aria-label="Shiny" /> : null}</strong><span>Nv. {combatant.nivel}</span></div><div className="battle-life-types">{combatant.tipos.map((type) => <TypeBadge key={type} type={type} />)}</div><div className="battle-life-track"><span style={{ width: `${percent}%`, background: percent < 20 ? '#e47b6c' : percent < 50 ? '#eac86f' : '#a8db75' }} /></div><small>HP {combatant.hp} / {combatant.maxHp}</small></div>;
}

function ItemChoices({ label, items, names, selected, onSelect, busy }) {
  return <div className="battle-item-choices" role="group" aria-label={label}>{items.map((item) => <button type="button" key={item.itemId} className={`battle-item-choice ${selected === item.itemId ? 'selected' : ''}`} aria-pressed={selected === item.itemId} disabled={busy} onClick={() => onSelect(item.itemId)}><img src={assetUrl(`/assets/items/${item.itemId}.png`)} alt="" /><span><strong>{names[item.itemId]}</strong><small>×{item.quantidade} na bolsa</small></span></button>)}</div>;
}

function HealingPicker({ healing, chosenHeal, setHealItem, act, busy, fainted, hpFull }) {
  return <div className="battle-healing"><div className="battle-item-heading"><strong>Itens de cura</strong><small>{fainted ? 'Escolha um Reviver' : hpFull ? 'HP completo' : 'Escolha e use um item'}</small></div>{healing.length ? <ItemChoices label="Item de cura" items={healing} names={healNames} selected={chosenHeal} onSelect={setHealItem} busy={busy} /> : <p>{fainted ? 'Você não possui Reviver. Aceite a derrota para encerrar a batalha.' : 'Nenhum item de cura na bolsa.'}</p>}<Button variant="outline" disabled={busy || !chosenHeal || hpFull} onClick={() => act('usar-item', { itemId: chosenHeal })}>Usar item</Button></div>;
}

function BallPicker({ balls, selected, setBall, act, busy }) {
  return <div className="battle-extras"><div className="battle-item-heading"><strong>Poké Bolas</strong><small>Escolha qual usar nesta tentativa</small></div>{balls.length ? <ItemChoices label="Poké Bola" items={balls} names={ballNames} selected={selected} onSelect={setBall} busy={busy} /> : <p>Nenhuma Poké Bola na bolsa.</p>}<div className="battle-extra-actions"><Button variant="outline" disabled={busy || !selected} onClick={() => act('capturar', { itemId: selected })}>Capturar</Button><Button variant="outline" disabled={busy} onClick={() => act('fugir')}>Fugir</Button></div></div>;
}

function AttackOption({ move, defenderTypes, types, busy, onAttack }) {
  const multiplier = effectiveness(move.tipo, defenderTypes, types);
  return <button type="button" disabled={busy} onClick={() => onAttack(move.nome)}><strong>{displayName(move.nome)}</strong><TypeBadge type={move.tipo} /><small>{move.categoria === 'physical' ? 'Físico' : 'Especial'} · Poder {move.poder}</small><span className={`effectiveness effectiveness-${multiplier > 1 ? 'super' : multiplier < 1 ? 'weak' : 'neutral'}`}>{effectivenessLabel(multiplier)}</span></button>;
}

function BattleMemberCard({ member, species, opponent, types, selected, onSelect, levelCap }) {
  const form = ownedForm(species, member);
  const outgoing = opponent ? Math.max(...form.tipos.map((type) => effectiveness(type, opponent.tipos, types))) : 1;
  const incoming = opponent ? Math.max(...opponent.tipos.map((type) => effectiveness(type, form.tipos, types))) : 1;
  const advantage = outgoing > incoming ? 'advantage' : outgoing < incoming ? 'disadvantage' : 'neutral';
  const label = { advantage: 'Vantagem', disadvantage: 'Desvantagem', neutral: 'Neutro' }[advantage];
  return <button type="button" className={`battle-member ${selected ? 'chosen' : ''}`} onClick={onSelect}><VariantImage species={form} mode="2d" shiny={member.shiny} /><span className="battle-member-info"><strong>{member.apelido || form.nomeExibicao}{member.shiny ? ' ✨' : ''}</strong><small>#{String(species.id).padStart(3, '0')} · Nv. {member.nivel} {levelCap && member.nivel > levelCap ? `→ ${levelCap}` : ''}</small><span className="battle-member-types">{form.tipos.map((entry) => <TypeBadge key={entry} type={entry} />)}</span></span>{opponent && <span className={`battle-matchup battle-matchup-${advantage}`}><b>{label}</b><small>Ataque ×{outgoing} · Defesa ×{incoming}</small></span>}</button>;
}

export function BattlePage({ area = 'batalhas' }) {
  const client = useQueryClient();
  const save = useSave();
  const catalog = useCatalogo();
  const collection = useColecao(save.data?.id);
  const challenges = useQuery({ queryKey: ['challenges', save.data?.id], queryFn: () => api('/batalhas/desafios'), enabled: Boolean(save.data?.id) });
  const current = useQuery({ queryKey: ['current-battle', save.data?.id], queryFn: () => api('/batalhas/atual'), enabled: Boolean(save.data?.id), staleTime: 0 });
  const inventory = useQuery({ queryKey: ['inventario', save.data?.usuarioId, save.data?.id], queryFn: () => api('/jogador/inventario'), enabled: Boolean(save.data?.id) });
  const [battle, setBattle] = useState(null);
  const [choice, setChoice] = useState({ tipo: 'treinador', dificuldade: 'facil' });
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [mode, setMode] = useState(() => localStorage.getItem('battle-sprite-mode') === '3d' ? '3d' : '2d');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ball, setBall] = useState('poke-ball');
  const [healItem, setHealItem] = useState('potion');
  const active = battle ?? current.data;
  function changeMode(value) { setMode(value); localStorage.setItem('battle-sprite-mode', value); }
  async function refresh() {
    await Promise.all([client.invalidateQueries({ queryKey: ['current-battle', save.data?.id] }), client.invalidateQueries({ queryKey: ['colecao'] }), client.invalidateQueries({ queryKey: ['inventario'] }), client.invalidateQueries({ queryKey: ['save'] }), client.invalidateQueries({ queryKey: ['challenges'] }), client.invalidateQueries({ queryKey: ['missoes'] }), client.invalidateQueries({ queryKey: ['historico'] })]);
  }
  async function start(requestedChoice = choice) {
    setBusy(true); setError('');
    try {
      const state = await api('/batalhas/iniciar', { method: 'POST', body: requestedChoice });
      setBattle(state); setSelected([]); await refresh();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  async function act(acao, extra = {}) {
    setBusy(true); setError('');
    try {
      const state = await api('/batalhas/acao', { method: 'POST', body: { batalhaId: active.id, versao: active.versao, acao, ...extra } });
      setBattle(state); if (['procurar', 'fugir', 'escolher'].includes(acao)) setSelected([]); await refresh();
    } catch (err) { setError(err.message); await current.refetch(); setBattle(null); } finally { setBusy(false); }
  }
  if (save.isPending || catalog.isPending || (save.data?.id && (collection.isPending || challenges.isPending || current.isPending || inventory.isPending))) return <Loading label="Preparando arena…" />;
  if (save.error || catalog.error || collection.error || challenges.error || current.error || inventory.error) return <Failure error={save.error || catalog.error || collection.error || challenges.error || current.error || inventory.error} retry={() => { save.refetch(); catalog.refetch(); collection.refetch(); challenges.refetch(); current.refetch(); inventory.refetch(); }} />;
  if (!save.data?.iniciadoEm) return <Navigate to="/saves" replace />;
  if (!save.data.inicialEspecieId) return <Navigate to="/inicial" replace />;
  if (active && !active.resultado && (active.tipo === 'selvagem') !== (area === 'selvagens')) return <Navigate to={active.tipo === 'selvagem' ? '/selvagens' : '/batalha'} replace />;
  const byId = new Map(catalog.data.pokemon.map((entry) => [entry.id, entry]));
  const selectedChallenge = challenges.data.lideres.find((entry) => entry.id === (active?.desafioId ?? choice.desafioId));
  const members = (collection.data ?? []).filter((member) => {
    const species = byId.get(member.especieId);
    const term = search.toLowerCase().trim();
    const form = ownedForm(species, member);
    return species && (!type || (form ?? species).tipos.includes(type)) && (!term || species.nomeExibicao.toLowerCase().includes(term) || form?.nomeExibicao.toLowerCase().includes(term) || member.apelido?.toLowerCase().includes(term) || String(species.id) === term.replace(/^#0*/, ''));
  });
  const balls = (inventory.data ?? []).filter((item) => ballNames[item.itemId] && item.quantidade > 0);
  const healing = (inventory.data ?? []).filter((item) => healNames[item.itemId] && item.quantidade > 0 && (active?.jogador?.hp === 0 ? ['revive', 'max-revive'].includes(item.itemId) : !['revive', 'max-revive'].includes(item.itemId)));
  const chosenHeal = healing.some((item) => item.itemId === healItem) ? healItem : healing[0]?.itemId;
  const chosenBall = balls.some((item) => item.itemId === ball) ? ball : balls[0]?.itemId;
  const hasShinyCharm = (inventory.data ?? []).some((item) => item.itemId === 'shiny-charm' && item.quantidade > 0);
  const opponent = active && byId.get(active.oponente.especieId);
  const partnerSpecies = active?.jogador && byId.get(active.jogador.especieId);
  const partner = ownedForm(partnerSpecies, active?.jogador);
  const teamLimit = active?.tipo === 'selvagem' ? 1 : active?.totalOponentes ?? 1;
  function toggleMember(id) { setSelected((current) => current.includes(id) ? current.filter((entry) => entry !== id) : current.length < teamLimit ? [...current, id] : [...current.slice(0, -1), id]); }
  return <>
    <PageTitle label={area === 'selvagens' ? 'ENCONTROS SELVAGENS · NOVE GERAÇÕES' : 'ARENA DE BATALHAS · DEZ CAMPANHAS'} title={area === 'selvagens' ? 'Explore a região.' : 'Escolha seu próximo desafio.'}>{area === 'selvagens' ? 'Procure Pokémon selvagens. Ao vencer o campeão da região, escolha espécie e nível.' : 'Enfrente treinadores, participe de torneios ou vença os desafios e campeões de cada região.'}</PageTitle>
    <div className="battle-toolbar"><span><Trophy size={16} /> Escolha uma região · Shiny base: <strong>1 em 4096</strong></span><SpriteControls mode={mode} setMode={changeMode} showShiny={false} /></div>
    {error && <p className="battle-error" role="alert">{error}</p>}
    {active ? <div className="battle-active">
      <div className="battle-topline"><span>{active.tipo === 'selvagem' ? 'ENCONTRO SELVAGEM' : `${active.tipo === 'desafio' ? 'DESAFIO' : active.tipo === 'torneio' ? 'TORNEIO' : 'TREINADOR'} · ${active.treinador.toUpperCase()}`}</span><span>{active.resultado ? 'RESULTADO' : active.jogador ? 'EM COMBATE' : 'ESCOLHA SEU PARCEIRO'} · {active.torneio && `TREINADOR ${active.torneio.rodada}/8 · `}RODADA {active.rodada}</span></div>
      {active.tipo === 'torneio' && !active.resultado && <button className="battle-abandon" type="button" disabled={busy} onClick={() => act('abandonar')}>Abandonar torneio</button>}
      <div className={`battle-arena ${!active.jogador ? 'battle-arena-encounter' : ''}`}><div className="battle-foe"><Life name={active.oponente.nome} combatant={active.oponente} /><VariantImage species={opponent} mode={mode} shiny={active.oponente.shiny} /></div><div className="battle-ground" /><div className="battle-player">{active.jogador ? <><VariantImage species={partner} mode={mode} shiny={active.jogador.shiny} back /><Life name={active.jogador.nome} combatant={active.jogador} /></> : <div className="battle-empty-player"><Swords size={22} /><strong>Seu lado da arena</strong><small>Escolha um Pokémon para começar</small></div>}</div></div>
      <div className="battle-console"><div className="battle-log" aria-live="polite"><strong>Registro de batalha</strong>{active.logs.slice(-5).map((entry, index) => <p key={`${active.rodada}-${index}`}>{entry}</p>)}</div>
{active.resultado ? <div className="battle-result"><h2>{({ vitoria: 'Vitória!', derrota: 'Derrota', captura: 'Pokémon capturado!', fuga: 'Você fugiu', desistencia: 'Torneio abandonado' })[active.resultado]}</h2>{active.xpGanho > 0 && <p>Seus Pokémon receberam {active.xpGanho} XP{active.novoNivel ? ` e chegaram ao nível ${active.novoNivel}` : ''}.</p>}{active.resultado === 'vitoria' && <p>Você ganhou {active.moedasGanhas.toLocaleString('pt-BR')} ₽.{active.itensGanhos?.length ? ` Itens: ${active.itensGanhos.map((item) => `${ballNames[item.itemId] ?? healNames[item.itemId] ?? rewardNames[item.itemId] ?? item.itemId} ×${item.quantidade}`).join(', ')}.` : ''}</p>}<div className="battle-result-actions"><Button disabled={busy} onClick={() => { setBattle(null); setSelected([]); }}>Escolher próxima batalha</Button>{active.tipo === 'selvagem' && <Button disabled={busy} onClick={() => { setSelected([]); start({ tipo: 'selvagem', regiao: active.regiao ?? 'kanto' }); }}>Procurar novo Pokémon</Button>}{active.tipo === 'treinador' && <Button disabled={busy} onClick={() => { setSelected([]); start({ tipo: 'treinador', dificuldade: active.dificuldade }); }}>Enfrentar outro treinador</Button>}</div></div> : active.jogador ? active.aguardandoReviver ? <div className="battle-actions"><h2>{active.jogador.nome} desmaiou.</h2><p className="panel-hint">Escolha um Pokémon da reserva, use um Reviver ou aceite a derrota.</p>{Boolean(active.reservas?.length) && <div className="battle-reserves">{active.reservas.map((member) => <Button key={member.pokemonId} variant="outline" disabled={busy} onClick={() => act('trocar', { pokemonId: member.pokemonId })}>Enviar {member.nome} · HP {member.hp}/{member.maxHp}</Button>)}</div>}<HealingPicker {...{ healing, chosenHeal, setHealItem, act, busy }} fainted /><Button variant="outline" disabled={busy} onClick={() => act('desistir')}>Aceitar derrota</Button></div> : <div className="battle-actions"><h2>O que {active.jogador.nome} vai fazer?</h2><div className="battle-moves">{active.jogador.ataques.map((move) => <AttackOption key={move.nome} move={move} defenderTypes={active.oponente.tipos} types={catalog.data.tipos} busy={busy} onAttack={(name) => act('ataque', { golpe: name })} />)}</div>{Boolean(active.reservas?.length) && <div className="battle-reserves"><strong>Trocar Pokémon</strong>{active.reservas.map((member) => <Button key={member.pokemonId} variant="outline" disabled={busy} onClick={() => act('trocar', { pokemonId: member.pokemonId })}>{member.nome} · HP {member.hp}/{member.maxHp}</Button>)}</div>}<HealingPicker {...{ healing, chosenHeal, setHealItem, act, busy }} hpFull={active.jogador.hp === active.jogador.maxHp} />{active.tipo === 'selvagem' && <BallPicker balls={balls} selected={chosenBall} setBall={setBall} act={act} busy={busy} />}</div> : <div className="battle-actions"><div className="battle-encounter-heading"><span className="battle-phase">{active.tipo === 'selvagem' ? 'NOVO ENCONTRO' : 'PRÓXIMO CONFRONTO'}</span><h2>Escolha seu Pokémon após ver o adversário</h2><p>{active.oponente.nome} · Nv. {active.oponente.nivel} · {active.oponente.tipos.map((entry) => typeNames[entry] ?? entry).join(' / ')}</p>{active.tipo === 'selvagem' && <div className="battle-encounter-actions"><Button variant="outline" disabled={busy} onClick={() => act('procurar')}><RefreshCw size={16} /> Procurar outro Pokémon</Button><Button variant="outline" disabled={busy} onClick={() => act('fugir')}><Footprints size={16} /> Fugir</Button></div>}</div>{selectedChallenge && <div className="battle-cap">Limite de {selectedChallenge.nome}: nível {selectedChallenge.nivel}</div>}<p>Escolha até {teamLimit} Pokémon · {selected.length}/{teamLimit} selecionados</p><div className="collection-filters"><label className="search-field"><Search size={16} /><input aria-label="Filtrar Pokémon para batalha por número ou nome" placeholder="Nº da Pokédex ou nome" value={search} onChange={(event) => setSearch(event.target.value)} /></label><select aria-label="Filtrar Pokémon para batalha por tipo" value={type} onChange={(event) => setType(event.target.value)}><option value="">Todos os tipos</option>{Object.entries(typeNames).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></div><div className="battle-collection">{members.map((member) => <BattleMemberCard key={member.id} member={member} species={byId.get(member.especieId)} opponent={opponent} types={catalog.data.tipos} selected={selected.includes(member.id)} onSelect={() => toggleMember(member.id)} levelCap={selectedChallenge?.nivel} />)}{!members.length && <p className="collection-empty">Nenhum Pokémon corresponde aos filtros.</p>}</div><Button className="battle-start" disabled={!selected.length || busy} onClick={() => act('escolher', { pokemonIds: selected })}>{busy ? 'Entrando…' : 'Escolher para batalhar'}</Button></div>}
      </div>
    </div> : <BattleSetup area={area} catalog={catalog.data} challenges={challenges.data} choice={choice} setChoice={setChoice} start={start} busy={busy} collectionCount={collection.data.length} hasShinyCharm={hasShinyCharm} coins={save.data.moedas} />}
  </>;
}
