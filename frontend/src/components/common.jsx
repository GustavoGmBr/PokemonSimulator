import { Link } from 'react-router-dom';
import { LoaderCircle, RefreshCw, ArrowUpRight } from 'lucide-react';
import { Button } from './ui/button';
import { assetUrl } from '../lib/api';

export const typeNames = { grass: 'Planta', poison: 'Veneno', fire: 'Fogo', water: 'Água', flying: 'Voador', bug: 'Inseto', normal: 'Normal', electric: 'Elétrico', ground: 'Terra', fairy: 'Fada', fighting: 'Lutador', psychic: 'Psíquico', rock: 'Pedra', steel: 'Aço', ice: 'Gelo', ghost: 'Fantasma', dragon: 'Dragão', dark: 'Sombrio' };
export function Brand() {
  return <Link to="/" className="brand" aria-label="Pokémon Simulator, início"><span className="pokeball-logo" /><span>POKÉMON<span className="brand-sub">SIMULATOR</span></span></Link>;
}
export function TypeBadge({ type, size = 'small' }) { return <span className={`type-badge type-${type} ${size === 'large' ? 'type-badge-large' : ''}`} aria-label={`Tipo ${typeNames[type] ?? type}`}><img src={assetUrl(`/assets/types/${type}-${size}.png`)} alt="" />{size === 'small' && (typeNames[type] ?? type)}</span>; }
export function PokemonImage({ pokemon, variant = 'artwork', ...props }) {
  return <img src={assetUrl(pokemon.sprites[variant])} alt={pokemon.nomeExibicao} {...props} />;
}
export function Loading({ label = 'Carregando sua aventura…' }) {
  return <div className="state-box" role="status"><LoaderCircle className="animate-spin" /><p>{label}</p></div>;
}
export function Failure({ error, retry }) {
  return <div className="state-box" role="alert"><p>{error?.message ?? 'Algo deu errado.'}</p><Button variant="outline" onClick={retry}><RefreshCw />Tentar novamente</Button></div>;
}
export function PageTitle({ label, title, children }) {
  return <div className="page-title"><span className="eyebrow">{label}</span><h1>{title}</h1>{children && <p className="muted">{children}</p>}</div>;
}
export function FeatureLink({ to, icon: Icon, title, description, disabled }) {
  const content = <><span className="feature-icon"><Icon size={22} /></span><span><strong>{title}</strong><small>{description}</small></span>{disabled ? <span className="soon">EM BREVE</span> : <ArrowUpRight className="ml-auto" size={19} />}</>;
  return disabled ? <div className="feature-link unavailable" aria-disabled="true">{content}</div> : <Link to={to} className="feature-link">{content}</Link>;
}
