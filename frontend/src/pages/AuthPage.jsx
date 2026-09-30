import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Leaf, Flame, Droplets } from 'lucide-react';
import { motion } from 'framer-motion';
import { Brand } from '../components/common';
import { Button } from '../components/ui/button';
import { api, assetUrl } from '../lib/api';
import { useSession } from '../stores/session';

export function AuthPage({ register = false }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const token = useSession((state) => state.token);
  const login = useSession((state) => state.login);
  const [showPassword, setShowPassword] = useState(false);
  const mutation = useMutation({
    mutationFn: (body) => api(register ? '/auth/register' : '/auth/login', { method: 'POST', body }),
    onSuccess: (data) => { client.clear(); login(data); navigate(register ? '/saves' : '/menu', { replace: true }); },
  });
  if (token) return <Navigate to={register ? '/saves' : '/menu'} replace />;
  function submit(event) {
    event.preventDefault();
    mutation.mutate(Object.fromEntries(new FormData(event.currentTarget)));
  }
  return <div className="auth-page">
    <section className="auth-world">
      <Brand />
      <div className="auth-story"><span className="eyebrow"><span className="status-dot" /> DE KANTO A PALDEA</span><h1>Toda grande jornada<br />começa com uma<br /><em>pequena escolha.</em></h1><p>Encontre os primeiros 1.025 Pokémon.<br />Escreva a sua própria história.</p></div>
      <div className="starter-art" aria-label="Bulbasaur, Charmander e Squirtle">
        <div className="orbit orbit-one" /><div className="orbit orbit-two" />
        {[1, 4, 7].map((id, index) => <motion.img key={id} src={assetUrl(`/assets/pokemon/${id}-artwork.png`)} alt={['Bulbasaur', 'Charmander', 'Squirtle'][index]} initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5, delay: index * .12 }} />)}
      </div>
      <div className="world-caption"><span><Leaf size={15} /> PLANTA</span><span><Flame size={15} /> FOGO</span><span><Droplets size={15} /> ÁGUA</span></div>
      <div className="auth-world-footer"><span>GERAÇÕES I A IX</span><span>1.025 POKÉMON · UMA NOVA AVENTURA</span></div>
    </section>
    <section className="auth-form-side">
      <span className="edition auth-edition">POKÉMON SIMULATOR / 01</span>
      <motion.div className="auth-form-wrap" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <span className="form-icon"><LockKeyhole size={22} /></span>
        <h2>{register ? 'Sua história começa aqui.' : 'Bom ter você de volta.'}</h2>
        <p className="muted">{register ? 'Crie sua conta e prepare-se para conhecer seu parceiro.' : 'Entre na sua conta para continuar sua jornada.'}</p>
        <div className="auth-tabs"><Link to="/login" className={!register ? 'selected' : ''}>Entrar</Link><Link to="/registro" className={register ? 'selected' : ''}>Criar conta</Link></div>
        <form onSubmit={submit} className="auth-form">
          {register && <label>Nome do treinador<input name="nomeTreinador" autoComplete="nickname" placeholder="Como podemos chamar você?" required minLength={2} maxLength={30} /></label>}
          <label>Usuário<input name="login" autoComplete="username" placeholder="Seu nome de usuário" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_]+" title="Use letras sem acentos, números ou sublinhado." /></label>
          <label>Senha<div className="password-field"><input name="senha" type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} placeholder={register ? 'Pelo menos 8 caracteres' : 'Sua senha'} required minLength={8} maxLength={72} /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
          {mutation.error && <p className="error-box" role="alert">{mutation.error.message}</p>}
          <Button type="submit" className="w-full mt-2" disabled={mutation.isPending}>{mutation.isPending ? 'Aguarde…' : register ? 'Criar minha conta' : 'Entrar na jornada'}<ArrowRight /></Button>
        </form>
        <p className="form-note">Seu progresso fica salvo na sua conta.</p>
      </motion.div>
      <p className="auth-disclaimer">Projeto de fãs. Pokémon pertence aos seus respectivos titulares.</p>
    </section>
  </div>;
}
