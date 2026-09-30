import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { useSession } from '../stores/session';

export function useSave() {
  const id = useSession((state) => state.usuario?.id);
  return useQuery({ queryKey: ['save', id], queryFn: () => api('/jogador/save'), enabled: Boolean(id) });
}
export function useCatalogo() {
  return useQuery({ queryKey: ['catalogo'], queryFn: () => api('/catalogo'), staleTime: Infinity });
}
export function useColecao(saveId) {
  const id = useSession((state) => state.usuario?.id);
  return useQuery({ queryKey: ['colecao', id, saveId], queryFn: () => api('/jogador/pokemon'), enabled: Boolean(id && saveId) });
}
