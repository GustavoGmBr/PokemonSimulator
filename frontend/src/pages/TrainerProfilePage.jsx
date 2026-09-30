import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, LockKeyhole, Trophy, Save } from 'lucide-react';
import { useSave } from '../lib/queries';
import { api } from '../lib/api';
import { Failure, Loading, PageTitle, TypeBadge } from '../components/common';
import { HistoryPanel } from '../components/JourneyPanels';

const badgeNames = {
  brock: 'Rocha', misty: 'Cascata', 'lt-surge': 'Trovão', erika: 'Arco-Íris', koga: 'Alma', sabrina: 'Pântano', blaine: 'Vulcão', giovanni: 'Terra',
  'johto-falkner': 'Zéfiro', 'johto-bugsy': 'Colmeia', 'johto-whitney': 'Planície', 'johto-morty': 'Névoa',
  'johto-chuck': 'Tempestade', 'johto-jasmine': 'Mineral', 'johto-pryce': 'Glacial', 'johto-clair': 'Dragão',
  'hoenn-roxanne': 'Pedra', 'hoenn-brawly': 'Punho', 'hoenn-wattson': 'Dínamo', 'hoenn-flannery': 'Calor',
  'hoenn-norman': 'Equilíbrio', 'hoenn-winona': 'Pluma', 'hoenn-tate-liza': 'Mente', 'hoenn-wallace': 'Chuva',
  'sinnoh-roark': 'Carvão', 'sinnoh-gardenia': 'Floresta', 'sinnoh-fantina': 'Relíquia', 'sinnoh-maylene': 'Pedregulho',
  'sinnoh-wake': 'Pântano', 'sinnoh-byron': 'Mina', 'sinnoh-candice': 'Sincelo', 'sinnoh-volkner': 'Farol',
  'unova1-cilan': 'Trio', 'unova1-lenora': 'Básica', 'unova1-burgh': 'Inseto', 'unova1-elesa': 'Volt',
  'unova1-clay': 'Abalo', 'unova1-skyla': 'Jato', 'unova1-brycen': 'Sincelo', 'unova1-drayden': 'Lenda',
  'unova2-cheren': 'Básica', 'unova2-roxie': 'Tóxica', 'unova2-burgh': 'Inseto', 'unova2-elesa': 'Volt',
  'unova2-clay': 'Abalo', 'unova2-skyla': 'Jato', 'unova2-drayden': 'Lenda', 'unova2-marlon': 'Onda',
  'kalos-viola': 'Inseto', 'kalos-grant': 'Penhasco', 'kalos-korrina': 'Briga', 'kalos-ramos': 'Planta',
  'kalos-clemont': 'Voltagem', 'kalos-valerie': 'Fada', 'kalos-olympia': 'Psíquica', 'kalos-wulfric': 'Iceberg',
  'alola-ilima': 'Ilima', 'alola-lana': 'Lana', 'alola-kiawe': 'Kiawe', 'alola-mallow': 'Mallow',
  'alola-sophocles': 'Sophocles', 'alola-acerola-trial': 'Acerola', 'alola-mina': 'Mina', 'alola-hapu': 'Hapu',
  'galar-milo': 'Planta', 'galar-nessa': 'Água', 'galar-kabu': 'Fogo', 'galar-bea': 'Luta',
  'galar-opal': 'Fada', 'galar-gordie': 'Rocha', 'galar-piers': 'Trevas', 'galar-raihan': 'Dragão',
  'paldea-katy': 'Inseto', 'paldea-brassius': 'Planta', 'paldea-iono': 'Elétrico', 'paldea-kofu': 'Água',
  'paldea-larry': 'Normal', 'paldea-ryme': 'Fantasma', 'paldea-tulip': 'Psíquico', 'paldea-grusha': 'Gelo',
};

export function TrainerProfilePage() {
  const save = useSave();
  const challenges = useQuery({ queryKey: ['challenges', save.data?.id], queryFn: () => api('/batalhas/desafios'), enabled: Boolean(save.data?.id) });
  if (save.isPending || (save.data?.id && challenges.isPending)) return <Loading label="Carregando perfil…" />;
  if (save.error || challenges.error) return <Failure error={save.error || challenges.error} retry={() => { save.refetch(); challenges.refetch(); }} />;
  if (!save.data?.iniciadoEm) return <Navigate to="/saves" replace />;
  if (!save.data.inicialEspecieId) return <Navigate to="/inicial" replace />;

  const regions = challenges.data.regioes;
  const kantoBadges = challenges.data.lideres.filter((entry) => entry.regiao === 'kanto' && entry.categoria === 'ginásio' && entry.vencido).length;
  return <><PageTitle label="PERFIL DO TREINADOR" title={save.data.nomeTreinador}>Insígnias e conquistas da sua jornada por região.</PageTitle>
    <div className="overview-stats"><div><Award /><span><strong>{kantoBadges}/8</strong><small>Insígnias de Kanto</small></span></div><div><Trophy /><span><strong>{save.data.vitorias}</strong><small>Vitórias</small></span></div><div><Trophy /><span><strong>{regions.filter((entry) => entry.concluida).length}/{regions.length}</strong><small>Regiões concluídas</small></span></div></div>
    {regions.map((region) => {
      const leaders = challenges.data.lideres.filter((entry) => entry.regiao === region.id);
      const gyms = leaders.filter((entry) => entry.categoria === 'ginásio');
      const finals = leaders.filter((entry) => entry.categoria !== 'ginásio');
      return <section className="profile-region" key={region.id}><div className="section-heading"><h2>{region.nome} · Geração {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][region.geracao - 1]}</h2><span>{region.concluida ? 'REGIÃO CONCLUÍDA' : region.desbloqueada ? 'EM PROGRESSO' : 'BLOQUEADA'}</span></div><h3>{region.challengeLabel === 'Provas Insulares' ? 'Provas Insulares' : 'Insígnias dos ginásios'}</h3><div className="badge-grid">{gyms.map((leader) => <article className={`gym-badge ${leader.vencido ? 'earned' : ''}`} key={leader.id}><div className="badge-medal">{leader.vencido ? <Award size={27} /> : <LockKeyhole size={21} />}</div><strong>{region.challengeLabel === 'Provas Insulares' ? 'Prova' : 'Insígnia'} {badgeNames[leader.id] ?? leader.nome}</strong><small>{leader.nome}</small><TypeBadge type={leader.tipo} /></article>)}</div><h3>{region.eliteLabel} e campeão</h3><div className="elite-progress">{finals.map((leader) => <span className={leader.vencido ? 'earned' : ''} key={leader.id}>{leader.vencido ? <Trophy size={15} /> : <LockKeyhole size={15} />}{leader.nome}</span>)}</div>{!region.desbloqueada && <p className="panel-hint">Conclua os desafios da etapa anterior para liberar {region.nome}.</p>}</section>;
    })}
    <section className="profile-region"><div className="section-heading"><h2>Minha jornada</h2><Save size={18} /></div><p className="panel-hint">Carregue seu save ou comece uma nova jornada.</p><Link className="profile-save-link" to="/saves"><Save size={16} /> Gerenciar saves</Link></section>
    <HistoryPanel saveId={save.data.id} />
  </>;
}
