import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle2, ArrowRight, Dna, Info } from 'lucide-react';
import { api } from '../lib/api';
import { statNames, displayName, xpProgress, previewStats, nextEvolutions, evolutionRequirements, movesKnownAtLevel, ownedForm } from '../lib/pokemon';
import { Loading, Failure, TypeBadge, PokemonImage } from './common';
import { PokemonViewer, SpriteControls, VariantImage } from './PokemonViewer';
import { MoveManager } from './MoveManager';
import { useSession } from '../stores/session';
import { useCatalogo } from '../lib/queries';

const versionNames = { 'firered-leafgreen': 'FireRed / LeafGreen', 'heartgold-soulsilver': 'HeartGold / SoulSilver', 'omega-ruby-alpha-sapphire': 'Omega Ruby / Alpha Sapphire', platinum: 'Platinum', 'black-white': 'Black / White', 'x-y': 'X / Y', 'ultra-sun-ultra-moon': 'Ultra Sun / Ultra Moon', 'sword-shield': 'Sword / Shield', 'scarlet-violet': 'Scarlet / Violet' };

function DetailBody({ species, owned, members, initialMode, initialShiny, allowEvolution, onEvolved, captured }) {
  const client = useQueryClient();
  const catalog = useCatalogo();
  const userId = useSession((state) => state.usuario?.id);
  const [memberId, setMemberId] = useState(owned?.id ?? members[0]?.id ?? 'preview');
  const member = owned ?? members.find((entry) => entry.id === memberId);
  const [referenceLevel, setReferenceLevel] = useState(5);
  const [tab, setTab] = useState('stats');
  const [galleryMode, setGalleryMode] = useState(initialMode);
  const [galleryShiny, setGalleryShiny] = useState(initialShiny);
  const [method, setMethod] = useState('level-up');
  const [evolving, setEvolving] = useState(false);
  const [evolutionError, setEvolutionError] = useState('');
  const level = member?.nivel ?? referenceLevel;
  const experience = member?.experiencia ?? species.experienciaPorNivel.find((entry) => entry.nivel === level).experiencia;
  const xp = xpProgress(species, level, experience);
  const stats = member?.atributos ?? previewStats(species, level);
  const evolutions = nextEvolutions(species.evolucao, species.id) ?? [];
  const spriteForEvolution = (target) => typeof target === 'number'
    ? catalog.data?.pokemon.find((entry) => entry.id === target)
    : [...(species.formasMega ?? []), ...(species.formasPrimal ?? []), ...(species.formasGmax ?? []), ...(species.formasFusao ?? [])].find((entry) => entry.nome === target);
  const moves = species.golpesAprendidos.filter((entry) => entry.poder > 0 && (method === 'all' || entry.metodo === method)).sort((a, b) => a.nivel - b.nivel || a.golpe.localeCompare(b.golpe));
  const form = ownedForm(species, member);
  const forms = [{ ...species, categoriaForma: 'Normal', requisitoForma: 'Forma original' },
    ...(species.formasMega ?? []).map((entry) => ({ ...entry, categoriaForma: 'Mega', requisitoForma: `Nível 60 + ${entry.itemId === 'rayquazatrite' ? 'Mega Rayquazatrite' : displayName(entry.itemId)} (uso único)` })),
    ...(species.formasGmax ?? []).map((entry) => ({ ...entry, categoriaForma: 'G-Max', requisitoForma: 'Pedra G-Max universal (uso único)' })),
    ...(species.formasPrimal ?? []).map((entry) => ({ ...entry, categoriaForma: 'Primal', requisitoForma: `Nível 60 + ${displayName(entry.itemId)} (uso único)` })),
    ...(species.formasFusao ?? []).map((entry) => ({ ...entry, categoriaForma: 'Fusão', requisitoForma: `${entry.parceiros.map((id) => catalog.data?.pokemon.find((pokemon) => pokemon.id === id)?.nomeExibicao ?? `#${id}`).join(' + ')} na coleção${entry.itemId ? ` + ${entry.itemId === 'ultra-burst-stone' ? 'Pedra Ultra Burst' : displayName(entry.itemId)}` : ''}` }))];
  const knownMoves = new Map(species.golpesAprendidos.map((move) => [move.golpe, move]));
  const equipped = member?.golpes?.length ? member.golpes.map((entry) => knownMoves.get(entry.nome) ?? { golpe: entry.nome, tipo: 'normal', categoria: 'physical', poder: 50, precisao: null }) : movesKnownAtLevel(species, level);
  const evolutionQuery = useQuery({ queryKey: ['evolution-options', member?.id, member?.especieId, member?.megaForma, member?.gmaxForma], queryFn: () => api(`/jogador/pokemon/${member.id}/evolucoes`), enabled: Boolean(allowEvolution && owned?.id), staleTime: 0 });
  const inventoryQuery = useQuery({ queryKey: ['inventario', userId, member?.saveId], queryFn: () => api('/jogador/inventario'), enabled: Boolean(allowEvolution && owned?.id) });
  const candyCount = inventoryQuery.data?.find((item) => item.itemId === 'rare-candy')?.quantidade ?? 0;
  const expCandies = [['exp-candy-p', 'P', 800], ['exp-candy-m', 'M', 3000], ['exp-candy-g', 'G', 10000], ['exp-candy-gg', 'GG', 30000]].map(([itemId, label, experience]) => ({ itemId, label, experience, quantity: inventoryQuery.data?.find((item) => item.itemId === itemId)?.quantidade ?? 0 })).filter((item) => item.quantity > 0);
  async function evolve(alvo) {
    setEvolving(true); setEvolutionError('');
    try {
      const updated = await api(`/jogador/pokemon/${member.id}/evoluir`, { method: 'POST', body: { alvo } });
      await Promise.all([client.invalidateQueries({ queryKey: ['colecao'] }), client.invalidateQueries({ queryKey: ['inventario'] }), client.invalidateQueries({ queryKey: ['dex-captured'] })]);
      onEvolved?.(updated);
    } catch (error) { setEvolutionError(error.message); } finally { setEvolving(false); }
  }
  async function useRareCandy() {
    setEvolving(true); setEvolutionError('');
    try {
      const updated = await api(`/jogador/pokemon/${member.id}/doce-raro`, { method: 'POST' });
      await Promise.all([client.invalidateQueries({ queryKey: ['colecao'] }), client.invalidateQueries({ queryKey: ['inventario'] }), client.invalidateQueries({ queryKey: ['evolution-options'] })]);
      onEvolved?.(updated);
    } catch (error) { setEvolutionError(error.message); } finally { setEvolving(false); }
  }
  async function useExpCandy(itemId) {
    setEvolving(true); setEvolutionError('');
    try {
      const updated = await api(`/jogador/pokemon/${member.id}/doce-exp`, { method: 'POST', body: { itemId } });
      await Promise.all([client.invalidateQueries({ queryKey: ['colecao'] }), client.invalidateQueries({ queryKey: ['inventario'] }), client.invalidateQueries({ queryKey: ['evolution-options'] })]);
      onEvolved?.(updated);
    } catch (error) { setEvolutionError(error.message); } finally { setEvolving(false); }
  }
  return <>
    <div className="detail-overview"><div><PokemonViewer key={form.nome} species={form} initialMode={initialMode} initialShiny={member?.shiny ?? initialShiny} /><div className="detail-types">{form.tipos.map((type) => <TypeBadge key={type} type={type} size="large" />)}</div></div>
      <section className="detail-summary">
        <span className={`capture-status ${captured || members.length || owned ? 'caught' : ''}`}><CheckCircle2 size={14} />{captured || members.length || owned ? 'Capturado neste save' : 'Ainda não capturado'}</span>
        <h3>{member?.apelido || form.nomeExibicao}</h3>
        {!owned && members.length > 0 && <label className="specimen-label">Exemplar<select value={memberId} onChange={(event) => setMemberId(event.target.value)}>{members.map((entry, index) => <option key={entry.id} value={entry.id}>{entry.apelido || species.nomeExibicao} #{index + 1} · Nv. {entry.nivel}{entry.shiny ? ' · Shiny' : ''}</option>)}<option value="preview">Prévia da espécie</option></select></label>}
        <p className="detail-context">{member ? `Seu Pokémon · na coleção${member.shiny ? ' · shiny com +20% em todos os atributos' : ''}${member.megaForma?.startsWith('necrozma-') ? ' · Fusão permanente' : member.megaForma?.endsWith('-primal') ? ' · Regressão Primal permanente' : member.megaForma ? ' · Mega Evolução permanente' : ''}${member.gmaxForma ? ' · G-Max permanente, +50% HP' : ''}` : 'Prévia da espécie — não é um Pokémon do seu save.'}</p>
        <div className="detail-level-row"><div><small>NÍVEL</small><strong>{level}</strong></div><div><small>XP TOTAL</small><strong>{experience.toLocaleString('pt-BR')}</strong></div><div><small>{member ? 'HP ATUAL' : 'HP ESTIMADO'}</small><strong>{member?.hpAtual ?? stats.hp}<span> / {stats.hp}</span></strong></div></div>
        <div className="xp-detail"><div><span>{xp.maximum ? 'Nível máximo' : `Progresso para o nível ${level + 1}`}</span><strong>{Math.floor(xp.progress)}%</strong></div><div className="xp-track" role="progressbar" aria-label="Experiência para o próximo nível" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(xp.progress)}><span style={{ width: `${xp.progress}%` }} /></div><small>{xp.maximum ? 'Este Pokémon chegou ao nível 100.' : `Faltam ${xp.remaining.toLocaleString('pt-BR')} XP · próximo nível em ${xp.next.toLocaleString('pt-BR')} XP`}</small></div>
        {allowEvolution && owned && (candyCount > 0 || expCandies.length > 0) && <div className="detail-candies"><strong>Doces de treino</strong><div>{candyCount > 0 && <button type="button" className="item-buy" disabled={evolving || level >= 100} onClick={useRareCandy}>Doce Raro ×{candyCount} · +1 nível</button>}{expCandies.map((candy) => <button type="button" className="item-buy" key={candy.itemId} disabled={evolving || level >= 100} onClick={() => useExpCandy(candy.itemId)}>Doce EXP {candy.label} ×{candy.quantity} · +{candy.experience.toLocaleString('pt-BR')} XP</button>)}</div></div>}
        {evolutionError && tab !== 'evolution' && <p role="alert" className="battle-error">{evolutionError}</p>}
        {!member && <label className="reference-level">Nível de referência<input type="range" min="1" max="100" value={referenceLevel} onChange={(event) => setReferenceLevel(Number(event.target.value))} /></label>}
        <div className="detail-measures"><span>Altura <strong>{species.altura} m</strong></span><span>Peso <strong>{species.peso} kg</strong></span><span>Crescimento <strong>{displayName(species.crescimento)}</strong></span></div>
      </section>
    </div>
    <div className="detail-tabs" role="group" aria-label="Seção de informações">{[['stats', 'Atributos'], ['moves', 'Ataques'], ...(allowEvolution && owned ? [['tm', 'TMs']] : []), ['evolution', 'Evolução'], ['forms', 'Galeria de formas']].map(([value, label]) => <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</button>)}</div>
    <div className="detail-section">
      {tab === 'stats' && <><div className="detail-section-title"><h3>Atributos de combate</h3><span>BASE / {member ? 'ATUAL' : 'ESTIMATIVA'}</span></div><div className="stat-grid">{Object.entries(statNames).map(([key, label]) => <div className="stat-row" key={key}><span>{label}</span><div className="stat-track"><span style={{ width: `${Math.min(100, form.atributosBase[key] / 255 * 100)}%` }} /></div><small>{form.atributosBase[key]}</small><strong>{stats[key]}</strong></div>)}</div>{(!member || !member.atributos) && <p className="detail-note"><Info size={14} />Estimativa com IVs 15, EVs zero e natureza neutra. Não altera seu save.</p>}<div className="ability-row"><strong>Habilidades da espécie</strong>{species.habilidades.map((ability) => <span key={ability.nome}>{displayName(ability.nome)}{ability.oculta ? ' (oculta)' : ''}</span>)}</div></>}
      {tab === 'moves' && <>
        <><div className="detail-section-title"><h3>Ataques equipados</h3><span>ATÉ 4</span></div><div className="equipped-moves">{equipped.map((data) => <div className="equipped-move" key={data.golpe}><div><strong>{displayName(data.golpe)}</strong><TypeBadge type={data.tipo} /></div><small>{({ physical: 'Físico', special: 'Especial' })[data.categoria]} · Poder {data.poder} · Precisão {data.precisao == null ? '—' : `${data.precisao}%`}</small></div>)}</div></>
        {allowEvolution && owned && <MoveManager member={member} species={species} mode="moves" onUpdated={onEvolved} />}
        <div className="detail-section-title learnset-title"><h3>Outros golpes ofensivos da espécie</h3><select aria-label="Método de aprendizado" value={method} onChange={(event) => setMethod(event.target.value)}><option value="level-up">Por nível</option><option value="machine">Máquinas</option><option value="tutor">Tutor</option><option value="egg">Reprodução</option><option value="all">Todos</option></select></div><p className="detail-note">Referência: {versionNames[species.versaoAprendizado] ?? displayName(species.versaoAprendizado ?? 'Desconhecida')}. {moves.length} golpes de dano.</p><div className="move-table-wrap"><table className="move-table"><thead><tr><th>Aprende</th><th>Ataque</th><th>Tipo</th><th>Poder</th><th>Precisão</th></tr></thead><tbody>{moves.map((move) => <tr key={`${move.golpe}-${move.metodo}-${move.nivel}`}><td>{move.metodo === 'level-up' ? `Nv. ${move.nivel || 1}` : ({ machine: 'Máquina', tutor: 'Tutor', egg: 'Ovo' })[move.metodo] ?? move.metodo}</td><td>{displayName(move.golpe)}</td><td><TypeBadge type={move.tipo} /></td><td>{move.poder ?? '—'}</td><td>{move.precisao == null ? '—' : `${move.precisao}%`}</td></tr>)}</tbody></table></div>{!moves.length && <p className="muted">Nenhum golpe para esse método nesta versão.</p>}
      </>}
      {tab === 'tm' && allowEvolution && owned && <><div className="detail-section-title"><h3>TMs compatíveis</h3><span>COMPRA POR POKÉMON</span></div><MoveManager member={member} species={species} mode="tm" onUpdated={onEvolved} /></>}
      {tab === 'forms' && <><div className="detail-section-title"><h3>Formas de {species.nomeExibicao}</h3><span>{forms.length} FORMA{forms.length > 1 ? 'S' : ''}</span></div><SpriteControls mode={galleryMode} setMode={setGalleryMode} shiny={galleryShiny} setShiny={setGalleryShiny} /><div className="form-gallery">{forms.map((entry) => <article className="form-gallery-card" key={entry.nome}><span className="form-gallery-kind">{entry.categoriaForma}</span><VariantImage species={entry} mode={galleryMode} shiny={galleryShiny} loading="lazy" /><h4>{entry.nomeExibicao}</h4><div className="form-gallery-types">{entry.tipos.map((type) => <TypeBadge key={type} type={type} />)}</div><p>{entry.requisitoForma}</p>{member && (member.megaForma === entry.nome || member.gmaxForma === entry.nome || (!member.megaForma && !member.gmaxForma && entry.categoriaForma === 'Normal')) && <small>Forma do seu Pokémon</small>}</article>)}</div></>}
      {tab === 'evolution' && <><div className="detail-section-title"><h3>Requisitos de evolução</h3><Dna size={20} /></div>{allowEvolution && owned && <div className="evolution-actions">{evolutionQuery.isPending ? <Loading label="Verificando evoluções…" /> : evolutionQuery.error ? <Failure error={evolutionQuery.error} retry={evolutionQuery.refetch} /> : evolutionQuery.data.length ? evolutionQuery.data.map((option) => <div className="evolution-action" key={`${option.tipo}-${option.alvo}`}><div className="evolution-action-info">{spriteForEvolution(option.alvo) && <PokemonImage pokemon={spriteForEvolution(option.alvo)} variant={member?.shiny ? 'frontShiny' : 'front'} className="evolution-sprite" />}<div><strong>{option.nome}</strong><small>{option.requisito}{option.itemId ? ` · Na mochila: ${option.quantidade}` : ''}</small>{!option.disponivel && <small>{option.motivo}</small>}</div></div><button type="button" disabled={!option.disponivel || evolving} onClick={() => evolve(option.alvo)}>{evolving ? 'Evoluindo…' : option.tipo === 'mega' ? 'Mega evoluir' : option.tipo === 'primal' ? 'Regressão Primal' : option.tipo === 'gmax' ? 'Ativar G-Max' : option.tipo === 'fusao' ? 'Fundir' : 'Evoluir'}</button></div>) : <p className="detail-note">Este Pokémon não possui evolução disponível nesta geração.</p>}{evolutionError && <p role="alert" className="battle-error">{evolutionError}</p>}</div>}{evolutions.length ? <div className="evolution-list">{evolutions.map((evolution) => <article key={evolution.especieId} className="evolution-row"><div className="evolution-name">{spriteForEvolution(evolution.especieId) && <PokemonImage pokemon={spriteForEvolution(evolution.especieId)} variant={member?.shiny ? 'frontShiny' : 'front'} className="evolution-sprite" />}<span>{species.nomeExibicao}</span><ArrowRight size={16} /><strong>{displayName(evolution.nome)}</strong>{evolution.especieId > 1025 ? <small>Fora do catálogo atual</small> : evolution.especieId > 905 ? <small>Geração IX · Paldea</small> : evolution.especieId > 809 ? <small>Geração VIII · Galar</small> : evolution.especieId > 721 ? <small>Geração VII · Alola</small> : evolution.especieId > 649 ? <small>Geração VI · Kalos</small> : evolution.especieId > 493 ? <small>Geração V · Unova</small> : evolution.especieId > 386 ? <small>Geração IV · Sinnoh</small> : evolution.especieId > 251 ? <small>Geração III · Hoenn</small> : evolution.especieId > 151 ? <small>Geração II · Johto</small> : null}</div><ul>{evolution.condicoes.map((condition, index) => <li key={index}>{index > 0 && <b>OU </b>}{evolutionRequirements(condition)}</li>)}</ul></article>)}</div> : !species.formasMega?.length && !species.formasPrimal?.length && !species.formasGmax?.length && !species.formasFusao?.length && <div className="evolution-final"><Dna /><p>Esta é uma forma final. Não possui evolução.</p></div>}{!owned && <p className="detail-note">Selecione um Pokémon capturado no menu inicial para evoluir.</p>}</>}
    </div>
  </>;
}

export function PokemonDetails({ speciesId, owned, members = [], onClose, initialMode = '2d', initialShiny = false, allowEvolution = false, onEvolved, captured = false }) {
  const query = useQuery({ queryKey: ['pokemon-details', speciesId], queryFn: () => api(`/catalogo/${speciesId}`), enabled: Boolean(speciesId), staleTime: Infinity });
  return <Dialog.Root open={Boolean(speciesId)} onOpenChange={(open) => !open && onClose()}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="pokemon-detail-dialog"><header className="detail-header"><div><span className="eyebrow">POKÉDEX / #{String(speciesId).padStart(3, '0')}</span><Dialog.Title>{ownedForm(query.data, owned)?.nomeExibicao ?? query.data?.nomeExibicao ?? 'Informações do Pokémon'}</Dialog.Title><Dialog.Description className="sr-only">Atributos, nível, experiência, ataques e requisitos de evolução.</Dialog.Description></div><Dialog.Close className="detail-close" aria-label="Fechar detalhes" onClick={onClose}><X size={22} /></Dialog.Close></header><div className="detail-scroll">{query.isPending ? <Loading /> : query.error ? <Failure error={query.error} retry={query.refetch} /> : <DetailBody key={speciesId} species={query.data} {...{ owned, members, initialMode, initialShiny, allowEvolution, onEvolved, captured }} />}</div></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
