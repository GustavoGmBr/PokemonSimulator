import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSession = create(persist((set) => ({
  token: null, usuario: null,
  login: ({ token, usuario }) => set({ token, usuario }),
  logout: () => set({ token: null, usuario: null }),
}), { name: 'pokemon-simulator-session', partialize: ({ token, usuario }) => ({ token, usuario }) }));
