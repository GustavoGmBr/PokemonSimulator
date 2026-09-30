import { Navigate } from 'react-router-dom';
import { useSave } from '../lib/queries';
import { Failure, Loading, PageTitle } from '../components/common';
import { MissionsPanel } from '../components/JourneyPanels';

export function MissionsPage() {
  const save = useSave();
  if (save.isPending) return <Loading label="Carregando missões…" />;
  if (save.error) return <Failure error={save.error} retry={save.refetch} />;
  if (!save.data?.iniciadoEm) return <Navigate to="/saves" replace />;
  if (!save.data.inicialEspecieId) return <Navigate to="/inicial" replace />;
  return <>
    <PageTitle label="OBJETIVOS DA JORNADA" title="Missões">Dez objetivos são renovados a cada duas horas. Complete-os e resgate as recompensas.</PageTitle>
    <MissionsPanel saveId={save.data.id} />
  </>;
}
