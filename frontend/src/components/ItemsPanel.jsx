import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Backpack, Coins, Search, Store } from 'lucide-react';
import { api, assetUrl } from '../lib/api';
import { useSession } from '../stores/session';
import { Loading, Failure } from './common';

const passiveItems = new Set(['lucky-egg', 'amulet-coin', 'shiny-charm', 'catching-charm']);
const removedItems = new Set(['antidote', 'paralyze-heal', 'awakening', 'burn-heal', 'ice-heal', 'full-heal', 'ether', 'elixir']);
const categories = [
  { id: 'captura', label: 'Captura' },
  { id: 'cura', label: 'Cura' },
  { id: 'treino', label: 'Treino' },
  { id: 'buff', label: 'Bônus' },
  { id: 'evolucao', label: 'Evolução' },
  { id: 'mega', label: 'Mega Pedras' },
  { id: 'primal', label: 'Orbes Primais' },
  { id: 'outros', label: 'Outros' },
];
const normalized = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function ItemCard({ item, quantity, shop, busy, cartQuantity, add }) {
  const ownedPassive = passiveItems.has(item.nome) && quantity > 0;
  const [amount, setAmount] = useState(1);
  return <article className={`item-card ${quantity > 0 ? 'owned-item' : ''}`}>
    {item.sprite ? <img src={assetUrl(item.sprite)} alt="" loading="lazy" /> : <Backpack size={24} />}
    <div><h3>{item.nomeExibicao}</h3><p>{item.descricao}</p>
      {shop && item.precoLoja > 0 && <div className="item-cart-controls"><span>{item.precoLoja.toLocaleString('pt-BR')} ₽ cada</span><label>Quantidade <input type="number" min="1" max={passiveItems.has(item.nome) ? 1 : 999} value={amount} disabled={ownedPassive || busy} onChange={(event) => setAmount(event.target.value)} /></label><button className="item-buy" type="button" disabled={busy || ownedPassive || !Number.isInteger(Number(amount)) || Number(amount) < 1 || Number(amount) > (passiveItems.has(item.nome) ? 1 : 999) || passiveItems.has(item.nome) && cartQuantity > 0} onClick={() => add(item, Number(amount))}>{ownedPassive ? 'Já adquirido' : cartQuantity ? `No carrinho: ${cartQuantity}` : 'Adicionar ao carrinho'}</button></div>}
      {shop && item.precoLoja == null && <span className="item-reward-only">Somente recompensa de torneio</span>}
    </div><span aria-label={`Quantidade: ${quantity}`} className="item-quantity">×{quantity}</span>
  </article>;
}

export function ItemsPanel({ save, shop = false }) {
  const client = useQueryClient();
  const userId = useSession((state) => state.usuario.id);
  const items = useQuery({ queryKey: ['items-catalog'], queryFn: () => api('/catalogo/itens'), staleTime: Infinity });
  const inventory = useQuery({ queryKey: ['inventario', userId, save.id], queryFn: () => api('/jogador/inventario') });
  const [category, setCategory] = useState('all');
  const [onlyOwned, setOnlyOwned] = useState(!shop);
  const [search, setSearch] = useState('');
  const [buying, setBuying] = useState(false);
  const [cart, setCart] = useState({});
  const [error, setError] = useState('');

  function add(item, amount) {
    setCart((current) => ({ ...current, [item.nome]: passiveItems.has(item.nome) ? 1 : Math.min(999, (current[item.nome] ?? 0) + amount) }));
  }
  async function checkout() {
    setBuying(true); setError('');
    try {
      await api('/jogador/itens/carrinho', { method: 'POST', body: { itens: Object.entries(cart).map(([itemId, quantidade]) => ({ itemId, quantidade })) } });
      setCart({});
      await Promise.all([client.invalidateQueries({ queryKey: ['inventario'] }), client.invalidateQueries({ queryKey: ['save'] }), client.invalidateQueries({ queryKey: ['evolution-options'] })]);
    } catch (caught) { setError(caught.message); } finally { setBuying(false); }
  }

  if (items.isPending || inventory.isPending) return <Loading label="Carregando itens…" />;
  if (items.error || inventory.error) return <Failure error={items.error || inventory.error} retry={() => { items.refetch(); inventory.refetch(); }} />;

  const quantities = new Map(inventory.data.map((item) => [item.itemId, item.quantidade]));
  const knownIds = new Set(items.data.map((item) => item.nome));
  const entries = [
    ...items.data,
    ...inventory.data.filter((item) => !knownIds.has(item.itemId) && !removedItems.has(item.itemId)).map((item) => ({ nome: item.itemId, nomeExibicao: item.itemId, categoria: 'outros', descricao: 'Item do seu inventário.' })),
  ];
  const total = inventory.data.filter((item) => !removedItems.has(item.itemId)).reduce((sum, item) => sum + item.quantidade, 0);
  const available = entries.filter((item) => (!onlyOwned || (quantities.get(item.nome) ?? 0) > 0) && (!shop || normalized(item.nomeExibicao).includes(normalized(search.trim()))));
  const groups = categories.map((entry) => ({ ...entry, items: available.filter((item) => item.categoria === entry.id) })).filter((entry) => entry.items.length && (category === 'all' || category === entry.id));
  const cartLines = Object.entries(cart).map(([id, quantity]) => ({ item: items.data.find((entry) => entry.nome === id), quantity })).filter((line) => line.item);
  const cartTotal = cartLines.reduce((sum, { item, quantity }) => sum + item.precoLoja * quantity, 0);

  return <section className="items-panel">
    <div className="section-heading"><h2>{shop ? <Store size={20} /> : <Backpack size={20} />}{shop ? 'Loja Pokémon' : 'Bolsa do treinador'}</h2><span>{total} NA MOCHILA{!shop && ` · ${save.moedas.toLocaleString('pt-BR')} ₽`}</span></div>
    {shop && <div className="shop-balance" role="status"><span className="shop-balance-icon"><Coins size={24} /></span><div><span>SEU SALDO</span><strong>{save.moedas.toLocaleString('pt-BR')} ₽</strong><small>Pokédólares disponíveis para compras</small></div></div>}
    {shop && <div className="shop-cart"><div><strong>Carrinho · {cartLines.reduce((sum, line) => sum + line.quantity, 0)} itens</strong><span>Total: {cartTotal.toLocaleString('pt-BR')} ₽</span></div>{cartLines.length > 0 && <div className="shop-cart-lines">{cartLines.map(({ item, quantity }) => <button type="button" key={item.nome} onClick={() => setCart((current) => { const next = { ...current }; delete next[item.nome]; return next; })} aria-label={`Remover ${item.nomeExibicao} do carrinho`}>{item.nomeExibicao} ×{quantity} <span>×</span></button>)}</div>}<button type="button" className="item-buy" disabled={!cartLines.length || cartTotal > save.moedas || buying} onClick={checkout}>{buying ? 'Finalizando…' : cartTotal > save.moedas ? 'Saldo insuficiente' : 'Finalizar compra'}</button></div>}
    <div className="items-toolbar">
      {shop && <label className="item-search"><Search size={16} /><input aria-label="Buscar item na loja" placeholder="Buscar item pelo nome" value={search} onChange={(event) => setSearch(event.target.value)} /></label>}
      <label className="owned-items-toggle"><input type="checkbox" checked={onlyOwned} onChange={(event) => setOnlyOwned(event.target.checked)} />Só itens que possuo</label>
    </div>
    <div className="item-categories" role="group" aria-label="Filtrar itens por categoria"><button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>Todos <span>{available.length}</span></button>{categories.filter((entry) => available.some((item) => item.categoria === entry.id)).map((entry) => <button type="button" key={entry.id} aria-pressed={category === entry.id} onClick={() => setCategory(entry.id)}>{entry.label} <span>{available.filter((item) => item.categoria === entry.id).length}</span></button>)}</div>
    <p className="panel-hint">{shop ? 'Busque pelo nome ou filtre por categoria para encontrar o item desejado.' : <>A bolsa mostra seus itens por categoria. <Link to="/loja" className="shop-link">Visitar a loja</Link></>}</p>
    {error && <p role="alert" className="battle-error">{error}</p>}
    {groups.map((group) => <div className="item-group" key={group.id}><div className="item-group-heading"><h3>{group.label}</h3><span>{group.items.length} {group.items.length === 1 ? 'TIPO' : 'TIPOS'}</span></div><div className="items-grid">{group.items.map((item) => <ItemCard key={item.nome} item={item} quantity={quantities.get(item.nome) ?? 0} shop={shop} busy={buying} cartQuantity={cart[item.nome] ?? 0} add={add} />)}</div></div>)}
    {!groups.length && <p className="items-empty">{shop ? 'Nenhum item encontrado com esses filtros.' : 'Nenhum item nesta categoria da bolsa.'}</p>}
  </section>;
}
