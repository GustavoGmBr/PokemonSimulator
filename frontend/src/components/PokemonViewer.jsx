import { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Sparkles, Box, Image, Pause, Play } from 'lucide-react';
import { assetUrl } from '../lib/api';

export function spriteVariant(mode, shiny, paused = false, back = false) {
  const base = back ? mode === '3d' && !paused ? 'animatedBack' : 'back' : mode === '3d' ? paused ? 'home' : 'animated' : 'front';
  return `${base}${shiny ? 'Shiny' : ''}`;
}
export function SpriteControls({ mode, setMode, shiny, setShiny, showShiny = true }) {
  return <div className="sprite-controls" aria-label="Visualização do Pokémon">
    <div className="view-segment"><button type="button" aria-pressed={mode === '2d'} onClick={() => setMode('2d')}><Image size={15} />2D</button><button type="button" aria-pressed={mode === '3d'} onClick={() => setMode('3d')}><Box size={15} />3D</button></div>
    {showShiny && <button type="button" className="shiny-toggle" aria-pressed={shiny} onClick={() => setShiny(!shiny)}><Sparkles size={15} />Shiny</button>}
  </div>;
}
export function VariantImage({ species, mode = '2d', shiny = false, paused = false, back = false, ...props }) {
  const reducedMotion = useReducedMotion();
  const variant = spriteVariant(mode, shiny, paused || reducedMotion, back);
  const [failed, setFailed] = useState(null);
  const source = species.sprites[variant];
  const fallback = species.sprites[`${back ? 'back' : 'front'}${shiny ? 'Shiny' : ''}`];
  return <img {...props} className={`variant-image ${mode === '2d' ? 'pixel-sprite' : 'model-sprite'} ${props.className ?? ''}`} src={assetUrl(failed === source ? fallback : source ?? fallback)} alt={`${species.nomeExibicao}${shiny ? ' shiny' : ''} — ${mode.toUpperCase()}${back ? ' de costas' : ''}`} onError={() => setFailed(source)} />;
}
export function PokemonViewer({ species, initialMode = '2d', initialShiny = false }) {
  const [mode, setMode] = useState(initialMode);
  const [shiny, setShiny] = useState(initialShiny);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();
  return <div className="pokemon-viewer"><SpriteControls {...{ mode, setMode, shiny, setShiny }} /><div className={`viewer-stage ${shiny ? 'shiny-stage' : ''}`}><span className="viewer-orbit" /><VariantImage {...{ species, mode, shiny, paused }} />{shiny && <span className="shiny-label"><Sparkles size={12} />FORMA SHINY</span>}</div><div className="viewer-caption"><span>{mode === '3d' ? 'Sprite 3D pré-renderizado' : 'Sprite clássico 2D'}</span>{mode === '3d' && !reducedMotion && <button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? 'Animar sprite' : 'Pausar animação'}>{paused ? <Play size={14} /> : <Pause size={14} />}{paused ? 'Animar' : 'Pausar'}</button>}</div></div>;
}
