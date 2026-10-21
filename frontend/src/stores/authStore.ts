import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  esTecnicoExterno: boolean;
}

interface Empresa {
  id: string;
  nombre: string;
}

interface AuthState {
  accessToken: string | null;
  usuario: Usuario | null;
  empresa: Empresa | null;
  isAuthenticated: boolean;
  setAuth: (token: string, usuario: Usuario, empresa: Empresa) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      usuario: null,
      empresa: null,
      isAuthenticated: false,

      setAuth: (token, usuario, empresa) =>
        set({ accessToken: token, usuario, empresa, isAuthenticated: true }),

      setAccessToken: (token) => set({ accessToken: token }),

      logout: () =>
        set({ accessToken: null, usuario: null, empresa: null, isAuthenticated: false }),
    }),
    {
      name: 'preventix-api-auth',
      partialize: (state) => ({ usuario: state.usuario, empresa: state.empresa, isAuthenticated: state.isAuthenticated }),
    }
  )
);
