import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useSession } from './stores/session';
import { api } from './lib/api';
import { Loading, Failure } from './components/common';
import { Layout } from './components/Layout';
import { AuthPage } from './pages/AuthPage';
import { SavesPage } from './pages/SavesPage';
import { StarterPage } from './pages/StarterPage';
import { MenuPage } from './pages/MenuPage';
import { PokedexPage } from './pages/PokedexPage';
import { BattlePage } from './pages/BattlePage';
import { ShopPage } from './pages/ShopPage';
import { TrainerProfilePage } from './pages/TrainerProfilePage';
import { MissionsPage } from './pages/MissionsPage';
import { CasinoPage } from './pages/CasinoPage';
import { MarketPage } from './pages/MarketPage';

function ProtectedRoute() {
  const token = useSession((state) => state.token);
  const query = useQuery({ queryKey: ['session', token], queryFn: () => api('/auth/me'), enabled: Boolean(token), staleTime: 60_000, retry: false });
  if (!token) return <Navigate to="/login" replace />;
  if (query.isPending) return <Loading label="Verificando sua sessão…" />;
  if (query.error) return <Failure error={query.error} retry={query.refetch} />;
  return <Outlet />;
}
export default function App() {
  const location = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);
  return <Routes>
    <Route path="/login" element={<AuthPage key="login" />} />
    <Route path="/registro" element={<AuthPage key="register" register />} />
    <Route element={<ProtectedRoute />}><Route element={<Layout />}>
      <Route path="/saves" element={<SavesPage />} />
      <Route path="/inicial" element={<StarterPage />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/pokedex" element={<PokedexPage />} />
      <Route path="/selvagens" element={<BattlePage area="selvagens" />} />
      <Route path="/batalha" element={<BattlePage area="batalhas" />} />
      <Route path="/perfil" element={<TrainerProfilePage />} />
      <Route path="/missoes" element={<MissionsPage />} />
      <Route path="/loja" element={<ShopPage />} />
      <Route path="/cassino" element={<CasinoPage />} />
      <Route path="/mercado" element={<MarketPage />} />
    </Route></Route>
    <Route path="*" element={<Navigate to="/saves" replace />} />
  </Routes>;
}
