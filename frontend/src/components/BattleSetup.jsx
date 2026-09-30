import { useState } from 'react';
import { CheckCircle2, CircleDot, LockKeyhole, Search, Swords, Trophy } from 'lucide-react';
import { TypeBadge } from './common';
import { Button } from './ui/button';
import { TournamentSetup } from './TournamentSetup';

const groups = [['ginásio', 'Ginásios'], ['elite', 'Elite dos 4'], ['campeão', 'Campeão']];
const difficulties = [
  { id: 'facil', title: 'Fácil', detail: '2–3 Pokémon · Nv. 20–30', prize: '1.000 ₽ · 2 Poké Bolas · 1 Poção' },
  { id: 'medio', title: 'Médio', detail: '3–4 Pokémon · Nv. 40–50', prize: '3.000 ₽ · 2 Super Bolas · 2 Superpoções' },
  { id: 'dificil', title: 'Difícil', detail: '6 Pokémon · Nv. 100', prize: '10.000 ₽ · 3 Ultra Bolas · 2 Hiperpoções · 1 Reviver' },
];

export function BattleSetup({ area, catalog, challenges, choice, setChoice, start, busy, collectionCount, hasShinyCharm, coins = 0 }) {
  const [section, setSection] = useState('treinadores');
  const [custom, setCustom] = useState(false);
  const [speciesId, setSpeciesId] = useState(1);
  const [level, setLevel] = useState(100);
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('kanto');
  const regions = challenges.regioes ?? [];
  const selectedRegion = region === 'todas'
    ? { id: 'todas', nome: 'todas as gerações liberadas', desbloqueada: true, escolhaSelvagem: false, nivelMaximoSelvagem: Math.max(...regions.filter((entry) => entry.desbloqueada).map((entry) => entry.nivelMaximoSelvagem)), especieInicial: 1, especieFinal: catalog.pokemon.length }
    : regions.find((entry) => entry.id === region);
  const shinyRolls = hasShinyCharm ? 1 + (selectedRegion?.marcosCharm ?? 0) : 1;
  const shinyOdds = Math.round(1 / (1 - (1 - 1 / 4096) ** shinyRolls));
  const selectedChallenge = challenges.lideres.find((entry) => entry.id === choice.desafioId);
  const species = catalog.pokemon.filter((entry) =>
    entry.id >= (selectedRegion?.especieInicial ?? 1) && entry.id <= (selectedRegion?.especieFinal ?? 151) &&
    (!search.trim() || entry.nomeExibicao.toLowerCase().includes(search.toLowerCase().trim()) || String(entry.id) === search.replace(/^#0*/, '') || entry.tipos.some((type) => type.includes(search.toLowerCase().trim()))));

  function chooseRegion(next) {
    setRegion(next.id);
    setCustom(false);
    setSearch('');
    setSpeciesId(next.especieInicial ?? 1);
    setChoice({ tipo: 'desafio', desafioId: challenges.lideres.find((leader) => leader.regiao === next.id && leader.desbloqueado)?.id ?? null });
  }

  const regionTabs = <div className="region-tabs">{area === 'selvagens' && <button type="button" className={region === 'todas' ? 'chosen' : ''} onClick={() => chooseRegion({ id: 'todas' })}>Todas as gerações liberadas</button>}{regions.map((entry) => <button key={entry.id} type="button" className={region === entry.id ? 'chosen' : ''} disabled={!entry.desbloqueada} onClick={() => chooseRegion(entry)}>{entry.nome} · Geração {entry.geracao}{!entry.desbloqueada ? ' 🔒' : ''}</button>)}</div>;

  if (area === 'selvagens') return <div className="battle-setup"><section className="battle-challenges">
    <div className="section-heading"><h2>Pokémon selvagens</h2><CircleDot size={18} /></div>{regionTabs}
    <p className="panel-hint">Encontre Pokémon de {selectedRegion?.nome}. Lendários e míticos aparecem após vencer a Elite dos 4 desta região. As regiões abrem com os desafios da etapa anterior; Kalos exige vencer Alder e Iris.</p>
    <button className={`challenge-row ${!custom ? 'chosen' : ''}`} onClick={() => setCustom(false)}><CircleDot size={19} /><span><strong>Encontro surpresa</strong><small>Espécie aleatória · até o nível {selectedRegion?.nivelMaximoSelvagem} · {region === 'todas' ? 'chance shiny conforme a geração encontrada' : `shiny ≈ 1 em ${shinyOdds}`}</small></span></button>
    {region !== 'todas' && <button className={`challenge-row ${custom ? 'chosen' : ''}`} disabled={!selectedRegion?.escolhaSelvagem} onClick={() => setCustom(true)}><Trophy size={19} /><span><strong>Escolher Pokémon e nível</strong><small>{selectedRegion?.escolhaSelvagem ? `Região concluída · espécies de ${selectedRegion.nome}, nível 1–100` : `Derrote o campeão de ${selectedRegion?.nome} para liberar`}</small></span></button>}
    {custom && selectedRegion?.escolhaSelvagem && <div className="wild-selector"><label className="search-field"><Search size={16} /><input aria-label="Buscar Pokémon selvagem" placeholder="Nº, nome ou tipo" value={search} onChange={(event) => setSearch(event.target.value)} /></label><div className="wild-species-list">{species.map((entry) => <button key={entry.id} type="button" className={speciesId === entry.id ? 'chosen' : ''} onClick={() => setSpeciesId(entry.id)}><span>#{String(entry.id).padStart(3, '0')} {entry.nomeExibicao}</span><span>{entry.tipos.map((type) => <TypeBadge key={type} type={type} />)}</span></button>)}</div><label className="wild-level">Nível desejado <input type="number" min="1" max="100" value={level} onChange={(event) => setLevel(event.target.value)} /></label></div>}
  </section><section className="battle-picker"><div className="section-heading"><h2>Pronto para procurar?</h2><span>{collectionCount} NA COLEÇÃO</span></div><p className="panel-hint">O encontro começa antes da escolha do seu Pokémon. Você poderá capturar ou fugir.</p><Button className="battle-start" disabled={busy || !selectedRegion?.desbloqueada || (custom && (!Number.isInteger(Number(level)) || Number(level) < 1 || Number(level) > 100))} onClick={() => start({ tipo: 'selvagem', regiao: region, ...(custom ? { selvagem: { regiao: region, especieId: speciesId, nivel: Number(level) } } : {}) })}>{busy ? 'Procurando…' : 'Procurar Pokémon'}</Button><p className="battle-footnote">Ao escolher o inicial, você recebe 10 Poké Bolas e 5 Poções.</p></section></div>;

  const tabs = <div className="battle-sections">
    <button className={section === 'treinadores' ? 'chosen' : ''} onClick={() => { setSection('treinadores'); setChoice({ tipo: 'treinador', dificuldade: 'facil' }); }}>Treinadores</button>
    <button className={section === 'desafios' ? 'chosen' : ''} onClick={() => { setSection('desafios'); setChoice({ tipo: 'desafio', desafioId: challenges.lideres.find((leader) => leader.regiao === region && leader.desbloqueado)?.id ?? null }); }}>Desafios</button>
    <button className={section === 'torneios' ? 'chosen' : ''} onClick={() => { setSection('torneios'); setChoice({ tipo: 'torneio', torneioId: challenges.torneios?.[0]?.id }); }}>Torneios</button>
  </div>;
  if (section === 'torneios') return <>{tabs}<TournamentSetup tournaments={challenges.torneios} {...{ choice, setChoice, start, busy, coins, collectionCount }} /></>;

  return <div className="battle-setup"><section className="battle-challenges"><div className="section-heading"><h2>Batalhas</h2><Swords size={18} /></div>{tabs}
    {section === 'treinadores' ? <><p className="panel-hint">O treinador e a equipe são gerados ao iniciar. Vença todos os Pokémon para ganhar a recompensa.</p>{difficulties.map((entry) => <button key={entry.id} className={`challenge-row ${choice.dificuldade === entry.id ? 'chosen' : ''}`} onClick={() => setChoice({ tipo: 'treinador', dificuldade: entry.id })}><Swords size={19} /><span><strong>{entry.title}</strong><small>{entry.detail}</small><small>{entry.prize}</small></span></button>)}</> : <><p className="panel-hint">Cada região reúne oito desafios iniciais, quatro finais e um campeão. A próxima etapa abre após os oito desafios; Kalos exige vencer Alder e Iris.</p>{regionTabs}{groups.map(([category, label]) => <div key={category} className="challenge-group"><h3>{category === 'ginásio' ? selectedRegion?.challengeLabel ?? label : category === 'elite' ? selectedRegion?.eliteLabel ?? label : label} · {selectedRegion?.nome}</h3>{challenges.lideres.filter((entry) => entry.categoria === category && entry.regiao === region).map((entry) => <button key={entry.id} className={`challenge-row ${choice.desafioId === entry.id ? 'chosen' : ''}`} disabled={!entry.desbloqueado} onClick={() => setChoice({ tipo: 'desafio', desafioId: entry.id })}><span className="challenge-symbol">{entry.vencido ? <CheckCircle2 /> : entry.desbloqueado ? <Swords /> : <LockKeyhole />}</span><span><strong>{entry.nome}</strong><small>{entry.tipo === 'champion' ? 'Campeão' : <TypeBadge type={entry.tipo} />} · limite Nv. {entry.nivel} · {entry.pokemon.length} Pokémon</small></span>{entry.vencido && <span className="challenge-done">VENCIDO</span>}</button>)}</div>)}</>}
  </section><section className="battle-picker"><div className="section-heading"><h2>{section === 'treinadores' ? 'Enfrentar treinador?' : 'Pronto para o desafio?'}</h2><span>{collectionCount} NA COLEÇÃO</span></div><p className="panel-hint">Veja o primeiro adversário antes de escolher um Pokémon da sua coleção.</p>{selectedChallenge && section === 'desafios' && <div className="battle-cap">{selectedChallenge.nome} · seus Pokémon lutam até o nível {selectedChallenge.nivel}</div>}<Button className="battle-start" disabled={busy || (section === 'desafios' && !selectedChallenge?.desbloqueado)} onClick={() => start(choice)}><Swords size={17} />{busy ? 'Iniciando…' : 'Iniciar batalha'}</Button></section></div>;
}
