import { Trophy } from 'lucide-react';
import { Button } from './ui/button';

const names = { 'poke-ball': 'Poké Bola', 'great-ball': 'Grande Bola', 'ultra-ball': 'Ultra Bola', 'master-ball': 'Master Bola', 'rare-candy': 'Doce Raro', 'exp-candy-p': 'Doce EXP P', 'exp-candy-m': 'Doce EXP M', 'exp-candy-g': 'Doce EXP G', 'exp-candy-gg': 'Doce EXP GG' };

export function TournamentSetup({ tournaments = [], choice, setChoice, start, busy, coins, collectionCount }) {
  const selected = tournaments.find((entry) => entry.id === choice.torneioId) ?? tournaments[0];
  return <div className="battle-setup"><section className="battle-challenges">
    <div className="section-heading"><h2>Torneios</h2><Trophy size={18} /></div>
    <p className="panel-hint">Oito treinadores em sequência. Após cada vitória, escolha outro Pokémon com HP cheio. A inscrição é cobrada na entrada e o prêmio vem após vencer a final.</p>
    {tournaments.map((entry) => <button key={entry.id} className={`challenge-row ${selected?.id === entry.id ? 'chosen' : ''}`} onClick={() => setChoice({ tipo: 'torneio', torneioId: entry.id })}><Trophy size={19} /><span><strong>{entry.nome}</strong><small>8 treinadores · {entry.minimo === entry.maximo ? entry.minimo : `${entry.minimo}–${entry.maximo}`} Pokémon por treinador · Nv. {entry.nivelMinimo}{entry.nivelMaximo !== entry.nivelMinimo && `–${entry.nivelMaximo}`}</small><small>Inscrição {entry.entrada.toLocaleString('pt-BR')} ₽ · prêmio {entry.moedas.toLocaleString('pt-BR')} ₽</small><small>{entry.premios.map(([id, min, max]) => `${min === max ? min : `${min}–${max}`} ${names[id]}`).join(' · ')}</small></span></button>)}
  </section><section className="battle-picker"><div className="section-heading"><h2>Entrar no torneio?</h2><span>{collectionCount} NA COLEÇÃO</span></div><p className="panel-hint">Veja o primeiro adversário antes de escolher seu Pokémon.</p>{selected && <div className="battle-cap">Inscrição: {selected.entrada.toLocaleString('pt-BR')} ₽ · saldo: {coins.toLocaleString('pt-BR')} ₽</div>}<Button className="battle-start" disabled={busy || !selected || coins < selected.entrada} onClick={() => start({ tipo: 'torneio', torneioId: selected.id })}><Trophy size={17} />{busy ? 'Iniciando…' : 'Pagar inscrição e começar'}</Button></section></div>;
}
