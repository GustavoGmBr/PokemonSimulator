import { useMemo, useState } from 'react';
import { Check, ChevronRight, Search, Star, Coins } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../stores/session';
import { api } from '../lib/api';
import { xpProgress, ownedForm } from '../lib/pokemon';
import { Loading, Failure, PokemonImage, TypeBadge, typeNames } from './common';
import { PokemonDetails } from './PokemonDetails';
import { ConfirmDialog } from './ConfirmDialog';

const GENERATION_ENDS = [151, 251, 386, 493, 649, 721, 809, 905, 1025];
const generationOf = (id) => GENERATION_ENDS.findIndex((end) => id <= end) + 1;
const strengthOf = (member) => Object.values(member.atributos ?? {}).reduce((sum, stat) => sum + (Number(stat) || 0), 0);
const formOf = (member, species) => {
  if (member.gmaxForma) return 'gmax';
  if (!member.megaForma) return 'normal';
  if (species.formasFusao?.some((form) => form.nome === member.megaForma)) return 'fusao';
  if (species.formasPrimal?.some((form) => form.nome === member.megaForma)) return 'primal';
  return 'mega';
};

export function TeamPanel({ save, catalogo, market = false }) {
  const userId = useSession((state) => state.usuario.id);
  const client = useQueryClient();
  const queryKey = ['colecao', userId, save.id];
  const query = useQuery({ queryKey, queryFn: () => api('/jogador/pokemon') });
  const values = useQuery({ queryKey: ['sale-values', userId, save.id], queryFn: () => api('/jogador/pokemon/valores-venda'), enabled: Boolean(save.id) });
  const favorite = useMutation({
    mutationFn: ({ id, favorito }) => api(`/jogador/pokemon/${id}/favorito`, { method: 'PATCH', body: { favorito } }),
    onSuccess: (updated) => {
      client.setQueryData(queryKey, (members = []) => members.map((member) => member.id === updated.id ? updated : member));
      if (updated.favorito) setSellSelection((current) => { const next = new Set(current); next.delete(updated.id); return next; });
    },
  });
  const sell = useMutation({
    mutationFn: (pokemonIds) => api('/jogador/pokemon/vender', { method: 'POST', body: { pokemonIds } }),
    onSuccess: (_, pokemonIds) => {
      client.setQueryData(queryKey, (members = []) => members.filter((member) => !pokemonIds.includes(member.id)));
      client.invalidateQueries({ queryKey: ['colecao'] });
      client.invalidateQueries({ queryKey: ['save'] });
      client.invalidateQueries({ queryKey: ['sale-values'] });
      setSelectedId(null); setSellSelection(new Set()); setSellMode(false); setSellOpen(false);
    },
  });
  const [selectedId, setSelectedId] = useState(null);
  const [sellMode, setSellMode] = useState(market);
  const [sellSelection, setSellSelection] = useState(new Set());
  const [sellOpen, setSellOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [generation, setGeneration] = useState('');
  const [shiny, setShiny] = useState('');
  const [formFilter, setFormFilter] = useState('');
  const [minLevel, setMinLevel] = useState('');
  const [maxLevel, setMaxLevel] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sort, setSort] = useState('capture-new');
  const speciesById = useMemo(() => new Map(catalogo.pokemon.map((species) => [species.id, species])), [catalogo]);
  const selected = query.data?.find((member) => member.id === selectedId);
  const filtered = useMemo(() => (query.data ?? []).filter((member) => {
    const species = speciesById.get(member.especieId);
    if (!species) return false;
    const form = ownedForm(species, member);
    const text = search.trim().toLowerCase();
    return (!type || form.tipos.includes(type))
      && (!generation || generationOf(species.id) === Number(generation))
      && (!shiny || member.shiny === (shiny === 'sim'))
      && (!formFilter || formOf(member, species) === formFilter)
      && (!minLevel || member.nivel >= Number(minLevel))
      && (!maxLevel || member.nivel <= Number(maxLevel))
      && (!onlyFavorites || member.favorito)
      && (!text || species.nomeExibicao.toLowerCase().includes(text) || form.nomeExibicao.toLowerCase().includes(text) || member.apelido?.toLowerCase().includes(text) || String(species.id) === text.replace(/^#0*/, ''));
  }).sort((a, b) => {
    if (sort === 'strength-high') return strengthOf(b) - strengthOf(a) || a.id.localeCompare(b.id);
    if (sort === 'strength-low') return strengthOf(a) - strengthOf(b) || a.id.localeCompare(b.id);
    const delta = new Date(b.capturadoEm) - new Date(a.capturadoEm);
    return (sort === 'capture-old' ? -delta : delta) || a.id.localeCompare(b.id);
  }), [query.data, speciesById, search, type, generation, shiny, formFilter, minLevel, maxLevel, onlyFavorites, sort]);
  function handleEvolved(updated) {
    client.setQueryData(queryKey, (members = []) => members.map((member) => member.id === updated.id ? updated : member));
  }
  function chooseMember(id) {
    if (!sellMode) { setSelectedId(id); return; }
    if (query.data?.find((member) => member.id === id)?.favorito) return;
    setSellSelection((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return <section className="team-panel">
    <div className="section-heading"><h2>{market ? 'Vender Pokémon' : 'Meus Pokémon'}</h2><span>{query.data?.length ?? 0} NA COLEÇÃO</span></div>
    <p className="panel-hint">{market ? 'Selecione os Pokémon que deseja vender. O valor soma bola de captura, nível e pedras usadas, com bônus de lendário e shiny. Favoritos ficam protegidos contra venda.' : 'Selecione um Pokémon para ver seus atributos, ataques e evolução. Marque os favoritos para protegê-los de vendas e apostas.'}</p>
    <div className="team-actions"><button type="button" className={`team-manage-button ${sellMode ? 'active' : ''}`} onClick={() => { setSellMode((current) => !current); setSellSelection(new Set()); }}>{sellMode ? 'Concluir seleção' : 'Loja de Pokémon · vender'}</button>{sellMode && <button type="button" className="team-sell-button" disabled={!sellSelection.size || sellSelection.size >= (query.data?.length ?? 0) || (query.data ?? []).some((member) => member.favorito && sellSelection.has(member.id))} onClick={() => setSellOpen(true)}><Coins size={15} /> Vender {sellSelection.size} Pokémon · {(values.data ?? []).filter((entry) => sellSelection.has(entry.pokemonId)).reduce((sum, entry) => sum + entry.valor, 0).toLocaleString('pt-BR')} ₽</button>}</div>
    <div className="team-filters">
      <label className="search-field"><Search size={16} /><input aria-label="Filtrar meus Pokémon por número ou nome" placeholder="Nº da Pokédex ou nome" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      <select aria-label="Filtrar meus Pokémon por tipo" value={type} onChange={(event) => setType(event.target.value)}><option value="">Todos os tipos</option>{Object.entries(typeNames).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select>
      <select aria-label="Filtrar meus Pokémon por geração" value={generation} onChange={(event) => setGeneration(event.target.value)}><option value="">Todas as gerações</option>{GENERATION_ENDS.map((_, index) => <option value={index + 1} key={index}>Geração {index + 1}</option>)}</select>
      <select aria-label="Filtrar meus Pokémon shiny" value={shiny} onChange={(event) => setShiny(event.target.value)}><option value="">Shiny: todos</option><option value="sim">Somente shiny</option><option value="nao">Sem shiny</option></select>
      <select aria-label="Filtrar meus Pokémon por forma" value={formFilter} onChange={(event) => setFormFilter(event.target.value)}><option value="">Todas as formas</option><option value="normal">Forma normal</option><option value="mega">Mega</option><option value="primal">Primal</option><option value="gmax">G-Max</option><option value="fusao">Fusão</option></select>
      <div className="team-level-filter"><span>Nível</span><input type="number" min="1" max="100" aria-label="Nível mínimo" placeholder="Mín." value={minLevel} onChange={(event) => setMinLevel(event.target.value)} /><span>–</span><input type="number" min="1" max="100" aria-label="Nível máximo" placeholder="Máx." value={maxLevel} onChange={(event) => setMaxLevel(event.target.value)} /></div>
      <label className="team-favorites-filter"><input type="checkbox" checked={onlyFavorites} onChange={(event) => setOnlyFavorites(event.target.checked)} /><Star size={14} fill={onlyFavorites ? 'currentColor' : 'none'} /> Favoritos</label>
      <select aria-label="Ordenar meus Pokémon" value={sort} onChange={(event) => setSort(event.target.value)}><option value="capture-new">Captura recente</option><option value="capture-old">Captura antiga</option><option value="strength-high">Mais fortes</option><option value="strength-low">Menos fortes</option></select>
    </div>
    {(favorite.error || values.error) && <p role="alert" className="team-filter-error">{(favorite.error || values.error).message}</p>}
    {query.isPending ? <Loading label="Carregando coleção…" /> : query.error ? <Failure error={query.error} retry={query.refetch} /> : <>
      <p className="team-result-count">{filtered.length} de {query.data.length} Pokémon exibidos</p>
      <div className="classic-team">{filtered.map((member) => {
        const species = speciesById.get(member.especieId);
        const form = ownedForm(species, member);
        const maxHp = member.atributos?.hp ?? member.hpAtual;
        const xp = xpProgress(species, member.nivel, member.experiencia);
        const name = member.apelido || form.nomeExibicao;
        return <div className={`party-entry ${sellSelection.has(member.id) ? 'marked-for-sale' : ''}`} key={member.id}>
          <button type="button" className={`party-slot ${member.hpAtual === 0 ? 'fainted' : ''}`} disabled={sellMode && member.favorito} onClick={() => chooseMember(member.id)} aria-label={`${sellMode ? member.favorito ? 'Favorito protegido' : 'Selecionar' : 'Ver informações de'} ${name}`} aria-pressed={sellMode && !member.favorito ? sellSelection.has(member.id) : undefined}><span className="party-number">#{String(species.id).padStart(3, '0')}</span><PokemonImage pokemon={form} variant={member.shiny ? 'frontShiny' : 'front'} /><div className="party-info"><div className="party-name"><strong>{name}{member.shiny ? ' ✨' : ''}</strong><span>Nv. {member.nivel}</span></div><div className="party-types">{form.tipos.map((entry) => <TypeBadge key={entry} type={entry} />)}</div><div className="party-meter"><small>HP</small><span className="hp-track"><span style={{ width: `${maxHp ? Math.max(0, Math.min(100, member.hpAtual / maxHp * 100)) : 0}%` }} /></span><span>{member.hpAtual}/{maxHp}</span></div><div className="party-meter"><small>XP</small><span className="xp-track"><span style={{ width: `${xp.progress}%` }} /></span><span>{xp.maximum ? 'MAX' : `${Math.floor(xp.progress)}%`}</span></div>{sellMode && <small>{member.favorito ? '★ Favorito protegido' : `Valor: ${((values.data ?? []).find((entry) => entry.pokemonId === member.id)?.valor ?? 0).toLocaleString('pt-BR')} ₽`}</small>}</div>{sellMode ? <span className="party-select-indicator">{sellSelection.has(member.id) && <Check size={15} />}</span> : <ChevronRight size={16} />}</button>
          <button type="button" className={`party-favorite ${member.favorito ? 'is-favorite' : ''}`} aria-label={`${member.favorito ? 'Remover' : 'Adicionar'} ${name} ${member.favorito ? 'dos' : 'aos'} favoritos`} aria-pressed={Boolean(member.favorito)} disabled={favorite.isPending && favorite.variables?.id === member.id} onClick={() => favorite.mutate({ id: member.id, favorito: !member.favorito })}><Star size={17} fill={member.favorito ? 'currentColor' : 'none'} /></button>
        </div>;
      })}{!filtered.length && <p className="collection-empty">{query.data.length ? 'Nenhum Pokémon corresponde aos filtros.' : 'Sua coleção está vazia.'}</p>}</div>
    </>}
    {selected && <PokemonDetails speciesId={selected.especieId} owned={selected} members={[selected]} allowEvolution onEvolved={handleEvolved} onClose={() => setSelectedId(null)} />}
    <ConfirmDialog open={sellOpen} onOpenChange={setSellOpen} onConfirm={() => sell.mutate([...sellSelection])} pending={sell.isPending} error={sell.error} title={`Vender ${sellSelection.size} Pokémon?`} description={`Você receberá ${(values.data ?? []).filter((entry) => sellSelection.has(entry.pokemonId)).reduce((sum, entry) => sum + entry.valor, 0).toLocaleString('pt-BR')} ₽. Os Pokémon sairão permanentemente da coleção; as espécies continuarão registradas na Pokédex.`} confirmLabel="Sim, vender" destructive />
  </section>;
}
