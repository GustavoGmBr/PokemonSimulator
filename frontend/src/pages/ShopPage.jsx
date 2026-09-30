import { Navigate } from 'react-router-dom';
import { useSave } from '../lib/queries';
import { Failure, Loading, PageTitle } from '../components/common';
import { ItemsPanel } from '../components/ItemsPanel';

export function ShopPage() {
  const save = useSave();
  if (save.isPending) return <Loading label="Abrindo a loja…" />;
  if (save.error) return <Failure error={save.error} retry={save.refetch} />;
  if (!save.data?.iniciadoEm) return <Navigate to="/saves" replace />;
  if (!save.data.inicialEspecieId) return <Navigate to="/inicial" replace />;
  return <div className="shop-page"><PageTitle label="POKÉ MART · NOVE GERAÇÕES" title="Prepare sua próxima batalha.">Use seus Pokédólares para comprar itens de captura, cura, evolução e bônus.</PageTitle><ItemsPanel save={save.data} shop /></div>;
}
