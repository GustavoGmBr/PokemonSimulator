import { useSession } from '../stores/session';

const origin = (import.meta.env.VITE_API_ORIGIN ?? '').replace(/\/$/, '');
export const assetUrl = (path) => `${origin}${path}`;
export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
export async function api(path, options = {}) {
  const token = useSession.getState().token;
  let response;
  try {
    response = await fetch(`${origin}/api${path}`, {
      ...options,
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch { throw new ApiError('Não foi possível conectar. Verifique se o backend está rodando.', 0); }
  let result;
  try { result = await response.json(); } catch { throw new ApiError('A API não respondeu corretamente. Verifique a conexão com o backend.', response.status); }
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) useSession.getState().logout();
    throw new ApiError(result.error || 'Não foi possível concluir a operação.', response.status);
  }
  return result.data;
}
