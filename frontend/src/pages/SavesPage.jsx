import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Plus, Clock3, MapPin, Save, Leaf } from 'lucide-react';
import { useSave, useCatalogo } from '../lib/queries';
import { api } from '../lib/api';
import { useSession } from '../stores/session';
import { PageTitle, Loading, Failure, PokemonImage } from '../components/common';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function SavesPage() {
  const saveQuery = useSave();
  const { data: catalogo } = useCatalogo();
  const usuario = useSession((state) => state.usuario);
  const [confirm, setConfirm] = useState(false);
  const [nome, setNome] = useState('');
  const navigate = useNavigate();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api('/jogador/save', { method: 'POST', body: { nomeTreinador: nome.trim() || saveQuery.data?.nomeTreinador || usuario.login, substituirSaveId: saveQuery.data?.id ?? null } }),
    onSuccess: (save) => { client.setQueryData(['save', usuario.id], save); for (const key of ['time', 'colecao', 'inventario']) client.removeQueries({ queryKey: [key] }); setConfirm(false); navigate('/inicial'); },
    onError: (error) => { if (error.status === 409) saveQuery.refetch(); },
  });
  if (saveQuery.isPending) return <Loading />;
  if (saveQuery.error) return <Failure error={saveQuery.error} retry={saveQuery.refetch} />;
  const save = saveQuery.data;
  const started = Boolean(save?.iniciadoEm);
  const pokemon = catalogo?.pokemon.find((entry) => entry.id === save?.inicialEspecieId);
  function newGame(event) { event.preventDefault(); mutation.reset(); if (save) setConfirm(true); else mutation.mutate(); }
  return <>
    <PageTitle label="SUA JORNADA" title="Qual será o próximo capítulo?">Continue de onde parou ou comece uma nova história em Kanto.</PageTitle>
    <div className="save-grid">
      <section className={`save-card existing-save ${started ? '' : 'empty-save'}`}>
        <div className="flex justify-between items-center"><span className="eyebrow">{started ? 'JORNADA SALVA' : 'SUA PRIMEIRA AVENTURA'}</span><Save size={21} /></div>
        <div className="save-art">{pokemon ? <PokemonImage pokemon={pokemon} /> : <span className="large-pokeball" />}</div>
        <span className="save-slot">SLOT 01 <span className="status-dot" /></span>
        <h2>{started ? save.nomeTreinador : 'Kanto está esperando.'}</h2>
        <p className="muted">{started ? pokemon ? `Você e ${pokemon.nomeExibicao} têm uma história pela frente.` : 'Sua jornada começou. Falta escolher seu primeiro parceiro.' : 'Escolha um nome e dê o primeiro passo na sua jornada.'}</p>
        {started && <div className="save-meta"><span><MapPin size={15} /> Pallet Town</span><span><Clock3 size={15} /> {new Date(save.atualizadoEm).toLocaleDateString('pt-BR')}</span></div>}
        <Button className="w-full mt-6" disabled={!started} onClick={() => navigate(save.inicialEspecieId ? '/menu' : '/inicial')}>Carregar save <ArrowRight /></Button>
      </section>
      <section className="save-card new-save"><span className="form-icon"><Plus size={24} /></span><h2>Uma nova história.</h2><p className="muted">Um novo começo, um novo parceiro.<br />A mesma vontade de explorar.</p>
        <form onSubmit={newGame}><label>Nome do treinador<input value={nome} onChange={(event) => setNome(event.target.value)} placeholder={save?.nomeTreinador || usuario.login} minLength={2} maxLength={30} /></label><Button variant="outline" type="submit" className="w-full mt-5" disabled={mutation.isPending}>Começar novo jogo <Plus /></Button></form>
        {mutation.error && !confirm && <p className="error-box mt-4" role="alert">{mutation.error.message}</p>}
        <p className="save-warning">{save ? 'Você possui um único slot. Um novo jogo substitui o save atual.' : 'Seu progresso será salvo automaticamente na sua conta.'}</p>
      </section>
    </div>
    <div className="tip"><Leaf size={18} /><span>Todo grande treinador já esteve exatamente aqui.</span><span className="ml-auto">PALLET TOWN, KANTO</span></div>
    <ConfirmDialog open={confirm} onOpenChange={setConfirm} onConfirm={() => mutation.mutate()} pending={mutation.isPending} error={mutation.error} title={started ? 'Começar de novo?' : 'Começar sua jornada?'} description={started ? 'O save atual, os Pokémon e os itens serão apagados e substituídos por uma nova jornada. Essa ação não pode ser desfeita.' : 'O save inicial da sua conta será substituído por uma nova jornada com o nome escolhido.'} confirmLabel={started ? 'Substituir e começar' : 'Começar jornada'} destructive={started} />
  </>;
}
