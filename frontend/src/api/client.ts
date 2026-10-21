import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor: inyectar token en cada request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor: renovar token si expira
let refreshRequest: Promise<string> | null = null;
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (typeof error.response?.data?.message === 'string') error.message = error.response.data.message;
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry && !original.url?.startsWith('/auth/login')) {
      original._retry = true;
      try {
        refreshRequest ??= axios.post('/api/auth/refresh', {}, { withCredentials: true })
          .then(({ data }) => data.data.accessToken as string)
          .finally(() => { refreshRequest = null; });
        const token = await refreshRequest;
        useAuthStore.getState().setAccessToken(token);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
