import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { displayName } from '../lib/pokemon';
import { Failure, Loading, TypeBadge } from './common';
import { Check, Plus } from 'lucide-react';

export function MoveManager({ member, species, mode, onUpdated }) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['pokemon-moves', member.id, member.nivel, member.especieId], queryFn: () => api(`/jogador/pokemon/${member.id}/golpes`) });
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { if (query.data) setSelected(query.data.equipados); }, [query.data]);
  const learned = new Map(species.golpesAprendidos.map((entry) => [entry.golpe, entry]));
  function toggle(name) {
    setSelected((current) => current.includes(name) ? current.length > 1 ? current.filter((entry) => entry !== name) : current : current.length < 4 ? [...current, name] : current);
  }
  async function equip() {
    setBusy('equip'); setError('');
    try {
      const updated = await api(`/jogador/pokemon/${member.id}/golpes`, { method: 'PATCH', body: { golpes: selected } });
      await Promise.all([client.invalidateQueries({ queryKey: ['pokemon-moves', member.id] }), client.invalidateQueries({ queryKey: ['colecao'] })]);
      onUpdated?.(updated);
    } catch (caught) { setError(caught.message); } finally { setBusy(''); }
  }
  async function buy(name) {
    setBusy(name); setError('');
    try {
      const result = await api(`/jogador/pokemon/${member.id}/tm`, { method: 'POST', body: { golpe: name } });
      await Promise.all([client.invalidateQueries({ queryKey: ['pokemon-moves', member.id] }), client.invalidateQueries({ queryKey: ['save'] })]);
      onUpdated?.(result.pokemon);
    } catch (caught) { setError(caught.message); } finally { setBusy(''); }
  }
  if (query.isPending) return <Loading label="Carregando ataques…" />;
  if (query.error) return <Failure error={query.error} retry={query.refetch} />;
  return <div className="move-manager">
    {mode === 'moves' ? <>
      <p className="detail-note">Escolha de 1 a 4 ataques. Golpes por nível ficam disponíveis quando o Pokémon aprende; TMs compradas ficam disponíveis apenas para este exemplar.</p>
      <div className="move-selection">{query.data.desbloqueados.map((name) => {
        const move = learned.get(name);
        const slot = selected.indexOf(name);
        return <button type="button" className={`move-choice ${slot >= 0 ? 'selected' : ''}`} key={name} aria-label={`${slot >= 0 ? 'Remover' : 'Selecionar'} ${displayName(name)}`} aria-pressed={slot >= 0} onClick={() => toggle(name)} disabled={busy !== '' || (slot < 0 && selected.length >= 4) || (slot >= 0 && selected.length === 1)}><span className="move-choice-icon">{slot >= 0 ? <Check size={15} /> : <Plus size={15} />}</span><span className="move-choice-info"><strong>{displayName(name)}</strong><small>{move ? `Poder ${move.poder} · ${move.categoria === 'special' ? 'Especial' : 'Físico'}` : 'Aprendido antes da evolução'}</small></span>{move && <TypeBadge type={move.tipo} />}<span className="move-choice-slot">{slot >= 0 ? `${slot + 1}º golpe` : 'Adicionar'}</span></button>;
      })}</div>
      <div className="move-manager-actions"><span>{selected.length}/4 selecionados</span><button type="button" className="item-buy" disabled={busy !== '' || !selected.length || JSON.stringify(selected) === JSON.stringify(query.data.equipados)} onClick={equip}>{busy === 'equip' ? 'Salvando…' : 'Salvar ataques'}</button></div>
    </> : <>
      <p className="detail-note">Compre o ataque diretamente para {member.apelido || species.nomeExibicao}. Cada compra vale somente para este Pokémon e o golpe poderá ser equipado quando quiser.</p>
      <div className="tm-list">{query.data.tms.map((move) => <div className="tm-card" key={move.nome}><div><strong>{displayName(move.nome)}</strong><TypeBadge type={move.tipo} /><small>{move.categoria === 'special' ? 'Especial' : 'Físico'} · Poder {move.poder} · Precisão {move.precisao == null ? '—' : `${move.precisao}%`}</small></div><button type="button" className="item-buy" disabled={busy !== '' || move.aprendido} onClick={() => buy(move.nome)}>{move.aprendido ? 'Aprendido' : busy === move.nome ? 'Comprando…' : `Comprar · ${move.preco.toLocaleString('pt-BR')} ₽`}</button></div>)}</div>
      {!query.data.tms.length && <p className="muted">Este Pokémon não possui TMs ofensivas compatíveis nesta geração.</p>}
    </>}
    {error && <p role="alert" className="battle-error">{error}</p>}
  </div>;
}
