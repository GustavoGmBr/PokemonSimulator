import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, Leaf, Flame, Droplets } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSave, useCatalogo } from '../lib/queries';
import { api } from '../lib/api';
import { useSession } from '../stores/session';
import { PageTitle, Loading, Failure, PokemonImage, TypeBadge } from '../components/common';
import { Button } from '../components/ui/button';
import { ConfirmDialog } from '../components/ConfirmDialog';

const details = {
  1: { icon: Leaf, description: 'Calmo e leal. Um pequeno broto com um enorme potencial.', theme: 'grass' },
  4: { icon: Flame, description: 'Corajoso e cheio de energia. A chama de uma grande amizade.', theme: 'fire' },
  7: { icon: Droplets, description: 'Companheiro e determinado. Pronto para mergulhar na aventura.', theme: 'water' },
  152: { icon: Leaf, description: 'Gentil e persistente. Sua jornada floresce em cada batalha.', theme: 'grass' },
  155: { icon: Flame, description: 'Tímido no começo, mas sua chama cresce com a amizade.', theme: 'fire' },
  158: { icon: Droplets, description: 'Animado e destemido. Um parceiro pronto para explorar.', theme: 'water' },
  252: { icon: Leaf, description: 'Ágil e observador. Um parceiro que cresce com cada desafio.', theme: 'grass' },
  255: { icon: Flame, description: 'Pequeno e valente. Sua chama anuncia uma grande aventura.', theme: 'fire' },
  258: { icon: Droplets, description: 'Leal e resistente. Pronto para atravessar Hoenn com você.', theme: 'water' },
  387: { icon: Leaf, description: 'Paciente e firme. Suas raízes crescerão por toda Sinnoh.', theme: 'grass' },
  390: { icon: Flame, description: 'Cheio de energia e coragem para cada novo desafio.', theme: 'fire' },
  393: { icon: Droplets, description: 'Orgulhoso e leal. Um parceiro para enfrentar o frio de Sinnoh.', theme: 'water' },
  495: { icon: Leaf, description: 'Elegante e decidido. Um parceiro pronto para explorar Unova.', theme: 'grass' },
  498: { icon: Flame, description: 'Animado e valente. Seu fogo cresce a cada desafio.', theme: 'fire' },
  501: { icon: Droplets, description: 'Curioso e determinado. Uma jornada inteira à sua frente.', theme: 'water' },
  650: { icon: Leaf, description: 'Resistente e curioso. Um grande companheiro para Kalos.', theme: 'grass' },
  653: { icon: Flame, description: 'Astuto e sereno. Sua chama ilumina a jornada.', theme: 'fire' },
  656: { icon: Droplets, description: 'Ágil e atento. Sempre pronto para o próximo desafio.', theme: 'water' },
  722: { icon: Leaf, description: 'Discreto e preciso. Pronto para explorar Alola.', theme: 'grass' },
  725: { icon: Flame, description: 'Cheio de personalidade e coragem.', theme: 'fire' },
  728: { icon: Droplets, description: 'Criativo e leal. Uma estrela para a sua coleção.', theme: 'water' },
  810: { icon: Leaf, description: 'Animado e dedicado. Um parceiro musical de Galar.', theme: 'grass' },
  813: { icon: Flame, description: 'Veloz e cheio de energia para novas vitórias.', theme: 'fire' },
  816: { icon: Droplets, description: 'Observador e estratégico. Sempre um passo à frente.', theme: 'water' },
  906: { icon: Leaf, description: 'Independente e curioso. Sua aventura em Paldea começa aqui.', theme: 'grass' },
  909: { icon: Flame, description: 'Afetuoso e confiante. Uma chama para toda a jornada.', theme: 'fire' },
  912: { icon: Droplets, description: 'Alegre e determinado. Pronto para seguir você.', theme: 'water' },
};
const generations = [
  { id: 1, region: 'Kanto', professor: 'CARVALHO', starters: [1, 4, 7] },
  { id: 2, region: 'Johto', professor: 'ELM', starters: [152, 155, 158] },
  { id: 3, region: 'Hoenn', professor: 'BIRCH', starters: [252, 255, 258] },
  { id: 4, region: 'Sinnoh', professor: 'ROWAN', starters: [387, 390, 393] },
  { id: 5, region: 'Unova', professor: 'JUNIPER', starters: [495, 498, 501] },
  { id: 6, region: 'Kalos', professor: 'SYCAMORE', starters: [650, 653, 656] },
  { id: 7, region: 'Alola', professor: 'KUKUI', starters: [722, 725, 728] },
  { id: 8, region: 'Galar', professor: 'MAGNOLIA', starters: [810, 813, 816] },
  { id: 9, region: 'Paldea', professor: 'CLAVELL', starters: [906, 909, 912] },
];
export function StarterPage() {
  const saveQuery = useSave();
  const catalogQuery = useCatalogo();
  const [selected, setSelected] = useState(1);
  const [generation, setGeneration] = useState(1);
  const [confirm, setConfirm] = useState(false);
  const client = useQueryClient();
  const navigate = useNavigate();
  const usuario = useSession((state) => state.usuario);
  const mutation = useMutation({
    mutationFn: () => api('/jogador/inicial', { method: 'POST', body: { saveId: saveQuery.data.id, especieId: selected } }),
    onSuccess: (save) => { client.setQueryData(['save', usuario.id], save); for (const key of ['time', 'colecao']) client.invalidateQueries({ queryKey: [key] }); navigate('/menu', { replace: true }); },
    onError: (error) => { if (error.status === 409) saveQuery.refetch(); },
  });
  if (saveQuery.isPending || catalogQuery.isPending) return <Loading label="Preparando seus primeiros parceiros…" />;
  if (saveQuery.error || catalogQuery.error) return <Failure error={saveQuery.error || catalogQuery.error} retry={() => { saveQuery.refetch(); catalogQuery.refetch(); }} />;
  if (!saveQuery.data?.iniciadoEm) return <Navigate to="/saves" replace />;
  if (saveQuery.data.inicialEspecieId) return <Navigate to="/menu" replace />;
  const selectedGeneration = generations.find((entry) => entry.id === generation);
  const starters = selectedGeneration.starters.map((id) => catalogQuery.data.pokemon.find((entry) => entry.id === id)).filter(Boolean);
  const chosen = starters.find((entry) => entry.id === selected);
  return <>
    <div className="step-indicator"><span className="complete"><Check size={12} /> CONTA CRIADA</span><i /><span className="current">02 · SEU PRIMEIRO POKÉMON</span><i /><span>03 · SUA JORNADA</span></div>
    <PageTitle label={`LABORATÓRIO ${selectedGeneration.professor}`} title="Uma escolha. Uma amizade para sempre.">Olá, {saveQuery.data.nomeTreinador}. Escolha a geração do seu primeiro parceiro. As regiões seguintes abrem com os desafios anteriores; Kalos exige vencer Alder e Iris.</PageTitle>
    <div className="region-tabs" role="group" aria-label="Escolher geração inicial">{generations.map((entry) => <button key={entry.id} type="button" className={generation === entry.id ? 'chosen' : ''} onClick={() => { setGeneration(entry.id); setSelected(entry.starters[0]); }}>{entry.region} · Geração {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'][entry.id - 1]}</button>)}</div>
    <div className="starter-grid" role="group" aria-label="Escolha seu Pokémon inicial">
      {starters.map((pokemon, index) => {
        const detail = details[pokemon.id]; const Icon = detail.icon;
        return <motion.button key={pokemon.id} type="button" className={`starter-card ${detail.theme} ${selected === pokemon.id ? 'chosen' : ''}`} aria-pressed={selected === pokemon.id} onClick={() => setSelected(pokemon.id)} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .08 }}>
          <div className="starter-card-top"><span>#{String(pokemon.id).padStart(3, '0')}</span><span className="selection-mark">{selected === pokemon.id && <Check size={15} />}</span></div>
          <div className="starter-picture"><span className="element-watermark"><Icon /></span><PokemonImage pokemon={pokemon} /></div>
          <div className="starter-info"><span className="starter-level">INICIAL · NÍVEL 05</span><h2>{pokemon.nomeExibicao}</h2><div className="flex gap-2 justify-center">{pokemon.tipos.map((type) => <TypeBadge key={type} type={type} />)}</div><p>{detail.description}</p><div className="starter-stats"><span><strong>{pokemon.atributosBase.hp}</strong>HP BASE</span><span><strong>{pokemon.atributosBase.attack}</strong>ATAQUE</span><span><strong>{pokemon.atributosBase.defense}</strong>DEFESA</span></div></div>
        </motion.button>;
      })}
    </div>
    <div className="selection-footer"><div><strong>Todo parceiro tem o seu potencial.</strong><p className="muted">Escolha com o coração. Seu inicial começará no nível 5.</p></div><Button disabled={!chosen} onClick={() => { mutation.reset(); setConfirm(true); }}>Escolher {chosen?.nomeExibicao}<ArrowRight /></Button></div>
    {chosen && <ConfirmDialog open={confirm} onOpenChange={setConfirm} onConfirm={() => mutation.mutate()} pending={mutation.isPending} error={mutation.error} title={`${chosen.nomeExibicao}, eu escolho você!`} description="Este será seu primeiro parceiro na coleção. Você só pode escolher um inicial por save." confirmLabel="Confirmar meu parceiro" />}
  </>;
}
