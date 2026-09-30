import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, BookOpen, LogOut, MapPin, CircleDot, Swords, Store, UserRound, Trees, ListChecks, Dices, BadgeDollarSign } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '../stores/session';
import { Brand } from './common';
import { Button } from './ui/button';

export function Layout() {
  const usuario = useSession((state) => state.usuario);
  const logout = useSession((state) => state.logout);
  const client = useQueryClient();
  const navigate = useNavigate();
  function signOut() { logout(); client.clear(); navigate('/login'); }
  return <div className="app-layout">
    <aside className="sidebar">
      <Brand />
      <div className="sidebar-region"><MapPin size={14} /> KANTO A PALDEA <span>01–09</span></div>
      <nav aria-label="Navegação principal">
        <NavLink to="/menu"><Home size={19} /> Início</NavLink>
        <NavLink to="/pokedex"><BookOpen size={19} /> Pokédex <span className="nav-count">1025</span></NavLink>
        <NavLink to="/selvagens"><Trees size={19} /> Selvagens</NavLink>
        <NavLink to="/batalha"><Swords size={19} /> Batalhas</NavLink>
        <NavLink to="/loja"><Store size={19} /> Loja</NavLink>
        <NavLink to="/mercado"><BadgeDollarSign size={19} /> Mercado Pokémon</NavLink>
        <NavLink to="/cassino"><Dices size={19} /> Pokécassino</NavLink>
        <NavLink to="/missoes"><ListChecks size={19} /> Missões</NavLink>
        <NavLink to="/perfil"><UserRound size={19} /> Perfil</NavLink>
      </nav>
      <div className="sidebar-bottom"><div className="trainer-avatar">{usuario.login.slice(0, 1).toUpperCase()}</div><div><strong>{usuario.login}</strong><small>Treinador Pokémon</small></div><Button variant="ghost" size="icon" onClick={signOut} aria-label="Sair da conta"><LogOut size={18} /></Button></div>
    </aside>
    <div className="workspace">
      <header className="topbar"><span><CircleDot size={14} /> SEU PRÓXIMO CAPÍTULO COMEÇA AQUI</span><span className="edition">NOVE GERAÇÕES <span className="status-dot" /></span></header>
      <main className="main-content"><Outlet /></main>
      <footer className="app-footer"><span>POKÉMON SIMULATOR</span><span>Uma jornada. 1.025 possibilidades.</span></footer>
    </div>
  </div>;
}
