import { Navigate } from 'react-router-dom';
import { useCatalogo, useSave } from '../lib/queries';
import { Failure, Loading, PageTitle } from '../components/common';
import { TeamPanel } from '../components/TeamPanel';

export function MarketPage() {
  const save = useSave();
  const catalog = useCatalogo();
  if (save.isPending || catalog.isPending) return <Loading label="Abrindo o mercado…" />;
  if (save.error || catalog.error) return <Failure error={save.error || catalog.error} retry={() => { save.refetch(); catalog.refetch(); }} />;
  if (!save.data?.iniciadoEm) return <Navigate to="/saves" replace />;
  if (!save.data.inicialEspecieId) return <Navigate to="/inicial" replace />;
  return <div className="market-page"><PageTitle label="MERCADO POKÉMON · SUA COLEÇÃO" title="Venda seus Pokémon.">Confira os valores, filtre sua coleção e venda vários exemplares de uma vez.</PageTitle><TeamPanel save={save.data} catalogo={catalog.data} market /></div>;
}
