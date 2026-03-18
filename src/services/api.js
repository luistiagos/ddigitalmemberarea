import axios from 'axios';

// URL da API lida da variável de ambiente Vite.
// Em dev, VITE_API_URL é vazio → baseURL fica '' → usa proxy do Vite (sem CORS)
// Em prod, VITE_API_URL aponta direto para o backend
const BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de requisição: injeta token JWT se disponível
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de resposta: trata erros globais
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Deixa o chamador tratar erros específicos (401, 403, etc.)
    return Promise.reject(error);
  }
);

export default api;
