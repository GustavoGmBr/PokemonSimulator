import { Navigate } from 'react-router-dom';
import { MapPin, Coins, Trophy, ShieldX, Target, Layers3, Fingerprint } from 'lucide-react';
import { useSave, useCatalogo, useColecao } from '../lib/queries';
import { PageTitle, Loading, Failure, PokemonImage } from '../components/common';
import { TeamPanel } from '../components/TeamPanel';
import { ItemsPanel } from '../components/ItemsPanel';

export function MenuPage() {
  const saveQuery = useSave();
  const catalogQuery = useCatalogo();
  const collectionQuery = useColecao(saveQuery.data?.id);
  if (saveQuery.isPending || catalogQuery.isPending || (saveQuery.data?.id && collectionQuery.isPending)) return <Loading />;
  if (saveQuery.error || catalogQuery.error || collectionQuery.error) return <Failure error={saveQuery.error || catalogQuery.error || collectionQuery.error} retry={() => { saveQuery.refetch(); catalogQuery.refetch(); collectionQuery.refetch(); }} />;
  const save = saveQuery.data;
  if (!save?.iniciadoEm) return <Navigate to="/saves" replace />;
  if (!save.inicialEspecieId) return <Navigate to="/inicial" replace />;
  const partner = catalogQuery.data.pokemon.find((entry) => entry.id === save.inicialEspecieId);
  const total = collectionQuery.data.length;
  const unique = new Set(collectionQuery.data.map((member) => member.especieId)).size;
  const played = save.vitorias + save.derrotas;
  const winRate = played ? `${(save.vitorias / played * 100).toFixed(1).replace('.', ',')}%` : '0%';
  return <>
    <PageTitle label="DE VOLTA À AVENTURA" title={`Olá, ${save.nomeTreinador}.`}>Mais um dia para escrever sua história de Kanto a Paldea.</PageTitle>
    <section className="journey-banner"><div><span className="location-pill"><MapPin size={14} /> POKEMON SIMULATOR</span><h2>Grandes jornadas.<br /><em>Pequenos começos.</em></h2><p>Sua aventura segue a cada encontro.<br />Explore, batalhe e amplie sua coleção.</p><div className="banner-partner"><span className="status-dot" /> Inicial escolhido: {partner.nomeExibicao}</div></div><div className="banner-art"><div className="orbit" /><PokemonImage pokemon={partner} /><span>#{String(partner.id).padStart(3, '0')}</span></div></section>
    <div className="home-stats" aria-label="Resumo da jornada"><div><Fingerprint /><span><strong>{unique.toLocaleString('pt-BR')}</strong><small>Espécies únicas capturadas</small></span></div><div><Layers3 /><span><strong>{total.toLocaleString('pt-BR')}</strong><small>Pokémon na coleção</small></span></div><div><Trophy /><span><strong>{save.vitorias.toLocaleString('pt-BR')}</strong><small>Vitórias</small></span></div><div><ShieldX /><span><strong>{save.derrotas.toLocaleString('pt-BR')}</strong><small>Derrotas</small></span></div><div><Target /><span><strong>{winRate}</strong><small>Taxa de vitórias</small></span></div><div><Coins /><span><strong>{save.moedas.toLocaleString('pt-BR')} ₽</strong><small>Dinheiro</small></span></div></div>
    <TeamPanel save={save} catalogo={catalogQuery.data} />
    <ItemsPanel save={save} />
  </>;
}
