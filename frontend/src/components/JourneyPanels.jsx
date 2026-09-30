import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, Gift, History, Sparkles, Swords, Trophy } from 'lucide-react';
import { api } from '../lib/api';
import { Failure, Loading } from './common';

const itemNames = { 'poke-ball': 'Poké Bola', 'great-ball': 'Super Bola', 'exp-candy-p': 'Doce EXP P', 'exp-candy-m': 'Doce EXP M' };

export function MissionsPanel({ saveId }) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['missoes', saveId], queryFn: () => api('/jogador/missoes'), refetchInterval: 60_000 });
  const [now, setNow] = useState(Date.now);
  const refreshedExpiry = useRef(null);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (query.data?.expiraEm && current >= Date.parse(query.data.expiraEm) && refreshedExpiry.current !== query.data.expiraEm) {
        refreshedExpiry.current = query.data.expiraEm;
        query.refetch();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [query.data?.expiraEm, query.refetch]);
  const seconds = Math.max(0, Math.ceil((Date.parse(query.data?.expiraEm ?? '') - now) / 1000) || 0);
  const countdown = [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map((part) => String(part).padStart(2, '0')).join(':');
  const available = query.data?.missoes.filter((mission) => !mission.resgatada && mission.progresso >= mission.alvo) ?? [];
  const refreshRewards = () => Promise.all([client.invalidateQueries({ queryKey: ['missoes', saveId] }), client.invalidateQueries({ queryKey: ['save'] }), client.invalidateQueries({ queryKey: ['inventario'] })]);
  const claim = useMutation({
    mutationFn: ({ periodo, indice }) => api(`/jogador/missoes/${indice}/resgatar`, { method: 'POST', body: { periodo } }),
    onSettled: refreshRewards,
  });
  const claimAll = useMutation({
    mutationFn: async ({ periodo, indices }) => {
      for (const indice of indices) await api(`/jogador/missoes/${indice}/resgatar`, { method: 'POST', body: { periodo } });
      return indices.length;
    },
    onSettled: refreshRewards,
  });
  const claiming = claim.isPending || claimAll.isPending;
  return <section className="profile-region mission-panel"><div className="section-heading"><h2>Missões da jornada</h2><Gift size={18} /></div>
    {query.isPending ? <Loading label="Preparando missões…" /> : query.error ? <Failure error={query.error} retry={query.refetch} /> : <><div className="mission-toolbar"><div className="mission-reset"><Clock3 size={20} /><span><small>PRÓXIMA RENOVAÇÃO</small><strong role="timer" aria-label="Tempo até o reset das missões">{countdown}</strong></span></div><button type="button" className="mission-claim-all" disabled={!available.length || claiming || seconds === 0} onClick={() => claimAll.mutate({ periodo: query.data.periodo, indices: available.map((mission) => mission.indice) })}><Gift size={17} />{claimAll.isPending ? 'Resgatando recompensas…' : `Receber todas as recompensas (${available.length})`}</button></div><p className="panel-hint">Dez missões renovadas a cada duas horas. Conclua as tarefas antes do contador chegar a zero.</p><div className="mission-grid">{query.data.missoes.map((mission) => <article className="mission-card" key={mission.indice}><span className="mission-kind">{mission.regiao ? mission.regiao.toUpperCase() : mission.dificuldade ? `TREINADOR · ${mission.dificuldade.toUpperCase()}` : 'TORNEIO'}</span><h3>{mission.titulo}</h3><div className="mission-progress"><span style={{ width: `${Math.min(100, mission.progresso / mission.alvo * 100)}%` }} /></div><small>{Math.min(mission.progresso, mission.alvo)} / {mission.alvo}</small><p>Recompensa: {mission.recompensa.moedas.toLocaleString('pt-BR')} ₽ · {mission.recompensa.itens.map((item) => `${item.quantidade} ${itemNames[item.itemId] ?? item.itemId}`).join(', ')}</p><button type="button" disabled={mission.resgatada || mission.progresso < mission.alvo || claiming || seconds === 0} onClick={() => claim.mutate({ periodo: query.data.periodo, indice: mission.indice })}>{mission.resgatada ? 'Resgatada' : mission.progresso >= mission.alvo ? 'Resgatar recompensa' : 'Em andamento'}</button></article>)}</div>{(claim.error || claimAll.error) && <p className="battle-error" role="alert">{claim.error?.message || claimAll.error?.message}</p>}</>}
  </section>;
}

export function HistoryPanel({ saveId }) {
  const [expanded, setExpanded] = useState(false);
  const query = useQuery({ queryKey: ['historico', saveId], queryFn: () => api('/jogador/historico') });
  return <section className="profile-region history-panel"><div className="section-heading"><h2>Histórico de batalha e captura</h2><History size={18} /></div><p className="panel-hint">Eventos registrados a partir desta atualização.</p>
    {query.isPending ? <Loading label="Carregando histórico…" /> : query.error ? <Failure error={query.error} retry={query.refetch} /> : <><div className="history-summary"><span><Trophy size={15} /> {query.data.resumo.vitorias} vitórias</span><span><Swords size={15} /> {query.data.resumo.derrotas} derrotas</span><span><Sparkles size={15} /> {query.data.resumo.shiniesEncontrados} shinies encontrados</span><span>{query.data.resumo.capturas} capturas</span></div><div className="history-list">{query.data.eventos.slice(0, expanded ? 60 : 12).map((event) => <article key={event.id}><span className={`history-event-type history-${event.tipo}`}>{event.tipo === 'shiny_encontrado' ? 'SHINY' : event.tipo === 'capturar' ? 'CAPTURA' : event.tipo === 'derrotar' ? 'DERROTADO' : event.tipo === 'batalha' ? event.resultado?.toUpperCase() : 'CONQUISTA'}</span><strong>{event.descricao}</strong><time dateTime={event.criadoEm}>{new Date(event.criadoEm).toLocaleString('pt-BR')}</time></article>)}{!query.data.eventos.length && <p className="panel-hint">As próximas batalhas e capturas aparecerão aqui.</p>}</div>{query.data.eventos.length > 12 && <button type="button" className="history-more" onClick={() => setExpanded((value) => !value)}>{expanded ? 'Mostrar menos' : `Ver mais ${query.data.eventos.length - 12} eventos`}</button>}</>}
  </section>;
}
