// ============================================================
// Na Gaveta — Serviço de API (Axios)
// Interceptors para JWT e tratamento de erros
// ============================================================

import axios from 'axios';

// Base URL: em dev usa proxy do Vite, em prod usa variável de ambiente
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// ── Interceptor de requisição: injeta token JWT ──────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ng_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Interceptor de resposta: trata 401 (token expirado) ─────
// CORREÇÃO: usar evento customizado em vez de window.location.href
// O hard redirect destruía o React e causava tela preta após login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Limpar sessão do localStorage
      localStorage.removeItem('ng_token');
      localStorage.removeItem('ng_user');
      // Disparar evento customizado para que o AuthProvider trate via React Router
      // (soft redirect — não destrói o estado do React)
      window.dispatchEvent(new CustomEvent('ng:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
