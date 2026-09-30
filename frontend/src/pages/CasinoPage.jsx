import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins, Dices, RotateCw, ShoppingBag, Ticket, Trophy } from 'lucide-react';
import { api, assetUrl } from '../lib/api';
import { useCatalogo, useColecao, useSave } from '../lib/queries';
import { Failure, Loading, PageTitle, PokemonImage } from '../components/common';
import { ownedForm } from '../lib/pokemon';
import './casino.css';

const pokemon = ['Pikachu', 'Bulbasaur', 'Charmander', 'Squirtle'];
const colors = ['vermelho', 'azul', 'verde'];
const pokemonId = { Pikachu: 25, Bulbasaur: 1, Charmander: 4, Squirtle: 7 };
const money = (amount) => Number(amount ?? 0).toLocaleString('pt-BR');
const betLabel = (bet) => bet.tipo === 'exata' ? `${bet.pokemon} · ${bet.cor ?? bet.numero}` : bet.tipo === 'dupla' ? `${bet.pokemon} · ${bet.numero} ou ${bet.numero + 1}` : bet.tipo === 'numero' ? `Número ${bet.numero}` : bet.tipo === 'pokemon' ? bet.pokemon : bet.cor;
function PokemonToken({ name }) { return <span className="casino-pokemon"><img src={assetUrl(`/assets/pokemon/${pokemonId[name]}-front.png`)} alt="" />{name}</span>; }
function SlotSymbol({ name }) {
  if (name === 'master-ball') return <span className="slot-token slot-master"><img src={assetUrl('/assets/items/master-ball.png')} alt="" /><b>7</b></span>;
  if (name === 'pikachu' || name === 'charmander') return <PokemonToken name={name === 'pikachu' ? 'Pikachu' : 'Charmander'} />;
  return <span className={`slot-token slot-${name}`}>{({ bar: 'BAR', replay: '↻', cherry: '🍒', blank: '·' })[name]}</span>;
}
function NumberInput({ label, value, onChange, min = 1, max = 20_000_000 }) { return <label className="casino-number">{label}<input type="number" min={min} max={max} step="1" value={value} onChange={(event) => onChange(event.target.value)} /></label>; }

function PokemonWagerPicker({ members, market, catalog, selectedId, onSelect, busy, selection }) {
  const [search, setSearch] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [sort, setSort] = useState('capture');
  const [visibleCount, setVisibleCount] = useState(48);
  const speciesById = new Map(catalog.pokemon.map((species) => [species.id, species]));
  const needle = search.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filtered = members.filter((member) => {
    const species = speciesById.get(member.especieId);
    const form = ownedForm(species, member);
    const value = market.get(member.id) ?? 0;
    const name = `${member.apelido ?? ''} ${species?.nomeExibicao ?? ''} ${form?.nomeExibicao ?? ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return (!needle || name.includes(needle) || String(member.especieId) === needle.replace(/^#0*/, ''))
      && (!minValue || value >= Number(minValue))
      && (!maxValue || value <= Number(maxValue));
  }).sort((a, b) => sort === 'value-high' ? (market.get(b.id) ?? 0) - (market.get(a.id) ?? 0) : sort === 'value-low' ? (market.get(a.id) ?? 0) - (market.get(b.id) ?? 0) : new Date(b.capturadoEm) - new Date(a.capturadoEm));
  const selected = members.find((member) => member.id === selectedId);
  return <div className="casino-pokemon-wager">
    <h3>Apostar um Pokémon da coleção</h3>
    <p>O Pokémon sai da coleção ao girar, mesmo se você perder. Favoritos são protegidos contra apostas. Em caso de acerto, o prêmio em Pokédólares é o valor de venda multiplicado por ×12, ×4 ou ×3.</p>
    <div className="casino-wager-filters">
      <label>Buscar por nome ou Nº Dex<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setVisibleCount(48); }} placeholder="Nome ou número" /></label>
      <NumberInput label="Valor mínimo (₽)" value={minValue} onChange={(value) => { setMinValue(value); setVisibleCount(48); }} min={0} />
      <NumberInput label="Valor máximo (₽)" value={maxValue} onChange={(value) => { setMaxValue(value); setVisibleCount(48); }} min={0} />
      <label>Ordenar<select value={sort} onChange={(event) => setSort(event.target.value)}><option value="capture">Captura recente</option><option value="value-low">Menor valor</option><option value="value-high">Maior valor</option></select></label>
    </div>
    <p className="casino-wager-count">{filtered.length} de {members.length} Pokémon encontrados · {members.filter((member) => !member.favorito).length} disponíveis para aposta</p>
    <div className="casino-wager-grid" role="group" aria-label="Escolher Pokémon para apostar">{filtered.slice(0, visibleCount).map((member) => {
      const form = ownedForm(speciesById.get(member.especieId), member);
      const name = member.apelido || form.nomeExibicao;
      return <button type="button" key={member.id} className={`casino-wager-card ${selectedId === member.id ? 'selected' : ''} ${member.favorito ? 'protected' : ''}`} aria-label={`${member.favorito ? 'Favorito protegido' : 'Apostar'} ${name}, nível ${member.nivel}, valor ${money(market.get(member.id))} ₽`} aria-pressed={member.favorito ? undefined : selectedId === member.id} disabled={busy || member.favorito} onClick={() => onSelect(selectedId === member.id ? '' : member.id)}><PokemonImage pokemon={form} variant={member.shiny ? 'frontShiny' : 'front'} loading="lazy" /><span><strong>{name}{member.shiny ? ' ✨' : ''}</strong><small>#{String(member.especieId).padStart(3, '0')} · Nv. {member.nivel}</small><b>{money(market.get(member.id))} ₽</b>{member.favorito && <small className="casino-protected-label">★ Favorito protegido</small>}</span></button>;
    })}</div>
    {!filtered.length && <p>Nenhum Pokémon corresponde aos filtros.</p>}
    {visibleCount < filtered.length && <button type="button" className="casino-more" onClick={() => setVisibleCount((count) => count + 48)}>Mostrar mais Pokémon</button>}
    {selected && !selected.favorito && <p className="casino-selected-wager">Selecionado: {selected.apelido || ownedForm(speciesById.get(selected.especieId), selected).nomeExibicao} · valor base {money(market.get(selected.id))} ₽ · palpite: {betLabel(selection)}</p>}
  </div>;
}

export function CasinoPage() {
  const client = useQueryClient();
  const save = useSave();
  const collection = useColecao(save.data?.id);
  const catalog = useCatalogo();
  const casino = useQuery({ queryKey: ['casino', save.data?.id], queryFn: () => api('/cassino'), enabled: Boolean(save.data?.inicialEspecieId) });
  const values = useQuery({ queryKey: ['sale-values', save.data?.usuarioId, save.data?.id], queryFn: () => api('/jogador/pokemon/valores-venda'), enabled: Boolean(save.data?.inicialEspecieId) });
  const [tab, setTab] = useState('slots');
  const [chips, setChips] = useState('10');
  const [bet, setBet] = useState('5');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cardType, setCardType] = useState('exata');
  const [cardPokemon, setCardPokemon] = useState('Pikachu');
  const [cardNumber, setCardNumber] = useState('1');
  const [cardBets, setCardBets] = useState([]);
  const [rouletteType, setRouletteType] = useState('exata');
  const [roulettePokemon, setRoulettePokemon] = useState('Pikachu');
  const [rouletteColor, setRouletteColor] = useState('vermelho');
  const [rouletteBets, setRouletteBets] = useState([]);
  const [wagerPokemonId, setWagerPokemonId] = useState('');
  const [itemAmounts, setItemAmounts] = useState({});
  async function action(path, body) {
    setBusy(true); setError('');
    try {
      const data = await api(`/cassino/${path}`, { method: 'POST', body });
      setResult(data);
      await Promise.all([client.invalidateQueries({ queryKey: ['casino'] }), client.invalidateQueries({ queryKey: ['save'] }), client.invalidateQueries({ queryKey: ['colecao'] }), client.invalidateQueries({ queryKey: ['sale-values'] }), client.invalidateQueries({ queryKey: ['inventario'] })]);
      return data;
    } catch (caught) { setError(caught.message); return null; } finally { setBusy(false); }
  }
  function validBet() { const value = Number(bet); return Number.isInteger(value) && value >= 5 && value <= 20_000_000; }
  function addCardBet() {
    if (!validBet()) { setError('A aposta mínima é de 5 fichas.'); return; }
    const entry = { tipo: cardType, valor: Number(bet) };
    if (cardType !== 'numero') entry.pokemon = cardPokemon;
    if (cardType !== 'pokemon') entry.numero = Number(cardNumber);
    if (cardType === 'dupla' && entry.numero > 5) { setError('Escolha o primeiro número da dupla entre 1 e 5.'); return; }
    setError(''); setCardBets((current) => [...current, entry]);
  }
  function rouletteSelection() { return { tipo: rouletteType, ...(rouletteType !== 'cor' ? { pokemon: roulettePokemon } : {}), ...(rouletteType !== 'pokemon' ? { cor: rouletteColor } : {}) }; }
  function addRouletteBet() { if (!validBet()) { setError('A aposta mínima é de 5 fichas.'); return; } setError(''); setRouletteBets((current) => [...current, { ...rouletteSelection(), valor: Number(bet) }]); }
  if (save.isPending || catalog.isPending || (save.data?.inicialEspecieId && (casino.isPending || collection.isPending || values.isPending))) return <Loading label="Abrindo o Pokécassino…" />;
  if (save.error || catalog.error || casino.error || collection.error || values.error) return <Failure error={save.error || catalog.error || casino.error || collection.error || values.error} retry={() => { save.refetch(); catalog.refetch(); casino.refetch(); collection.refetch(); values.refetch(); }} />;
  if (!save.data?.iniciadoEm) return <Navigate to="/saves" replace />;
  if (!save.data.inicialEspecieId) return <Navigate to="/inicial" replace />;
  const wallet = casino.data;
  const members = collection.data ?? [];
  const market = new Map((values.data ?? []).map((entry) => [entry.pokemonId, entry.valor]));
  const selectedMember = members.find((entry) => entry.id === wagerPokemonId);
  const currentBet = Number(bet);
  const cardCost = cardBets.reduce((sum, entry) => sum + entry.valor, 0);
  const rouletteCost = rouletteBets.reduce((sum, entry) => sum + entry.valor, 0);
  const casinoCart = Object.entries(itemAmounts).filter(([, qty]) => Number(qty) > 0).map(([itemId, quantity]) => ({ itemId, quantidade: Number(quantity) }));
  const casinoCartCost = casinoCart.reduce((sum, line) => sum + (wallet.itens.find((item) => item.itemId === line.itemId)?.preco ?? 0) * line.quantidade, 0);
  return <div className="casino-page"><PageTitle label="POKÉCASSINO · FICHAS E PRÊMIOS" title="A sorte está lançada.">Compre fichas, escolha seu jogo e troque seus ganhos por Poké Bolas e itens de cura.</PageTitle>
    <div className="casino-wallet"><div><Coins size={21} /><span>Pokédólares</span><strong>{money(wallet.moedas)} ₽</strong></div><div><Ticket size={21} /><span>Fichas</span><strong>{money(wallet.fichas)}</strong></div><div className="casino-chip-buy"><NumberInput label="Comprar fichas · 5 ₽ cada" value={chips} onChange={setChips} /><button disabled={busy || !Number.isInteger(Number(chips)) || Number(chips) < 1 || Number(chips) * 5 > wallet.moedas} onClick={() => action('fichas', { quantidade: Number(chips) })}>Comprar · {money(Number(chips) * 5)} ₽</button></div></div>
    <div className="casino-tabs" role="tablist" aria-label="Jogos e loja do cassino">{[['slots', 'Caça-níqueis', Dices], ['cards', 'Cartas', Ticket], ['roulette', 'Roleta', RotateCw], ['voltorb', 'Voltorb Flip', Trophy], ['shop', 'Loja de fichas', ShoppingBag]].map(([id, label, Icon]) => <button type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} key={id} onClick={() => { setTab(id); setResult(null); setError(''); }}><Icon size={17} /> {label}</button>)}</div>
    {error && <p role="alert" className="battle-error">{error}</p>}
    {tab === 'slots' && <section className="casino-panel"><h2>Caça-níqueis</h2><p>Cinco linhas sempre ativas. Três Master Bolas pagam ×100, BAR ×30, Pokémon ×5, replay devolve a aposta; cereja na primeira coluna paga metade da aposta por linha.</p><NumberInput label="Aposta em fichas" value={bet} onChange={setBet} min={5} /><button disabled={busy || !validBet() || currentBet > wallet.fichas} onClick={() => action('slots', { aposta: currentBet })}>Girar</button>{result?.simbolos && <><div className="casino-slots">{result.simbolos.map((symbol, index) => <div key={index}><SlotSymbol name={symbol} /></div>)}</div><p role="status">Prêmio: {money(result.premio)} fichas · {result.linhas.length ? `linhas ${result.linhas.map((line) => line.linha).join(', ')}` : 'sem combinação'}</p></>}</section>}
    {tab === 'cards' && <section className="casino-panel"><h2>Jogo de cartas</h2><p>Baralho de 24 cartas: 4 Pokémon e números de 1 a 6. Faça mais de um palpite por rodada.</p><div className="casino-form"><label>Palpite<select value={cardType} onChange={(event) => setCardType(event.target.value)}><option value="exata">Carta exata · ×24</option><option value="dupla">Dois números vizinhos · ×12</option><option value="numero">Número · ×6</option><option value="pokemon">Pokémon · ×4</option></select></label>{cardType !== 'numero' && <label>Pokémon<select value={cardPokemon} onChange={(event) => setCardPokemon(event.target.value)}>{pokemon.map((entry) => <option key={entry}>{entry}</option>)}</select></label>}{cardType !== 'pokemon' && <label>Número<select value={cardNumber} onChange={(event) => setCardNumber(event.target.value)}>{[1, 2, 3, 4, 5, ...(cardType === 'dupla' ? [] : [6])].map((entry) => <option key={entry}>{entry}</option>)}</select></label>}<NumberInput label="Fichas neste palpite" value={bet} onChange={setBet} min={5} /><button onClick={addCardBet} disabled={busy || cardBets.length >= 24}>Adicionar palpite</button></div><BetList bets={cardBets} remove={(index) => setCardBets((current) => current.filter((_, position) => position !== index))} /><button disabled={busy || !cardBets.length || cardCost > wallet.fichas} onClick={async () => { if (await action('cartas', { apostas: cardBets })) setCardBets([]); }}>Virar carta · {money(cardCost)} fichas</button>{result?.carta && <p className="casino-result" role="status"><PokemonToken name={result.carta.pokemon} /> Carta {result.carta.numero} · prêmio {money(result.premio)} fichas</p>}</section>}
    {tab === 'roulette' && <section className="casino-panel"><h2>Roleta Pokémon</h2><p>Doze casas: 4 Pokémon em 3 cores. Aposta exata ×12, Pokémon ×4 ou cor ×3.</p><div className="casino-roulette-board">{pokemon.flatMap((name) => colors.map((color) => <div className={`casino-roulette-cell ${color}`} key={`${name}-${color}`}><PokemonToken name={name} /><small>{color}</small></div>))}</div><div className="casino-form"><label>Tipo de palpite<select value={rouletteType} onChange={(event) => setRouletteType(event.target.value)}><option value="exata">Pokémon + cor · ×12</option><option value="pokemon">Pokémon · ×4</option><option value="cor">Cor · ×3</option></select></label>{rouletteType !== 'cor' && <label>Pokémon<select value={roulettePokemon} onChange={(event) => setRoulettePokemon(event.target.value)}>{pokemon.map((entry) => <option key={entry}>{entry}</option>)}</select></label>}{rouletteType !== 'pokemon' && <label>Cor<select value={rouletteColor} onChange={(event) => setRouletteColor(event.target.value)}>{colors.map((entry) => <option key={entry}>{entry}</option>)}</select></label>}<NumberInput label="Fichas nesta aposta" value={bet} onChange={setBet} min={5} /><button onClick={addRouletteBet} disabled={busy || rouletteBets.length >= 24}>Adicionar aposta</button></div><BetList bets={rouletteBets} remove={(index) => setRouletteBets((current) => current.filter((_, position) => position !== index))} /><PokemonWagerPicker members={members} market={market} catalog={catalog.data} selectedId={wagerPokemonId} onSelect={setWagerPokemonId} busy={busy} selection={rouletteSelection()} /><button disabled={busy || (!rouletteBets.length && !wagerPokemonId) || rouletteCost > wallet.fichas || wagerPokemonId && (members.length < 2 || selectedMember?.favorito)} onClick={async () => { const pokemonAposta = wagerPokemonId ? { pokemonId: wagerPokemonId, ...rouletteSelection() } : undefined; if (await action('roleta', { apostas: rouletteBets, pokemonAposta })) { setRouletteBets([]); setWagerPokemonId(''); } }}>Girar roleta · {money(rouletteCost)} fichas{wagerPokemonId ? ' + Pokémon' : ''}</button>{result?.resultado && <p className="casino-result" role="status"><PokemonToken name={result.resultado.pokemon} /> {result.resultado.cor} · {money(result.premio)} fichas{result.pokemonPremio && ` · Pokémon vendido por ${money(result.pokemonPremio.ganho)} ₽`}</p>}</section>}
    {tab === 'voltorb' && <section className="casino-panel"><h2>Voltorb Flip</h2><p>Abra todas as casas ×2 e ×3 para levar o acumulado. Uma Voltorb encerra a rodada e perde a entrada. As pistas mostram a soma e a quantidade de Voltorb por linha e coluna.</p>{wallet.voltorb ? <><div className="voltorb-board">{Array.from({ length: 5 }, (_, row) => <div className="voltorb-row" key={row}>{wallet.voltorb.casas.slice(row * 5, row * 5 + 5).map((value, col) => <button key={col} disabled={busy || value !== null} onClick={() => action('voltorb/virar', { indice: row * 5 + col })}>{value === null ? '?' : value === 0 ? '💣' : `×${value}`}</button>)}<span>Σ {wallet.voltorb.linhas[row].pontos} · 💣 {wallet.voltorb.linhas[row].voltorbs}</span></div>)}<div className="voltorb-row voltorb-clues">{wallet.voltorb.colunas.map((clue, index) => <span key={index}>Σ {clue.pontos}<br />💣 {clue.voltorbs}</span>)}</div></div><p role="status">Acumulado: {money(wallet.voltorb.acumulado)} fichas · multiplicadores restantes: {wallet.voltorb.restantes}</p><button className="casino-quiet" disabled={busy} onClick={() => action('voltorb/desistir', {})}>Desistir e perder a entrada</button></> : <><NumberInput label="Aposta de entrada" value={bet} onChange={setBet} min={5} /><button disabled={busy || !validBet() || currentBet > wallet.fichas} onClick={() => action('voltorb', { aposta: currentBet })}>Iniciar rodada</button></>}{result?.resultado && <p className="casino-result" role="status">{result.resultado === 'vitoria' ? `Vitória! ${money(result.premio)} fichas` : result.resultado === 'derrota' ? 'Voltorb! Você perdeu a aposta.' : `Casa ×${result.valor} aberta.`}</p>}</section>}
    {tab === 'shop' && <section className="casino-panel"><h2>Loja de fichas</h2><p>Use fichas para comprar Poké Bolas, incluindo Master Bola, e itens de cura.</p><div className="casino-items">{wallet.itens.map((item) => <div key={item.itemId}><img src={assetUrl(item.sprite)} alt="" /><strong>{item.nome}</strong><span>{money(item.preco)} fichas</span><NumberInput label="Quantidade" value={itemAmounts[item.itemId] ?? '0'} onChange={(value) => setItemAmounts((current) => ({ ...current, [item.itemId]: value }))} min={0} max={999} /></div>)}</div><p>Compras selecionadas: {casinoCart.reduce((sum, line) => sum + line.quantidade, 0)} · total {money(casinoCartCost)} fichas</p><button disabled={busy || !casinoCart.length || casinoCartCost > wallet.fichas || casinoCart.some((line) => !Number.isInteger(line.quantidade) || line.quantidade > 999)} onClick={async () => { if (await action('itens', { itens: casinoCart })) setItemAmounts({}); }}>Comprar itens</button></section>}
  </div>;
}

function BetList({ bets, remove }) { return bets.length ? <div className="casino-bets">{bets.map((entry, index) => <div key={index}><span>{betLabel(entry)} · {money(entry.valor)} fichas</span><button onClick={() => remove(index)} aria-label={`Remover aposta ${index + 1}`}>×</button></div>)}</div> : <p className="casino-empty">Nenhuma aposta adicionada.</p>; }
