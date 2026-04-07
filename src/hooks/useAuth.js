import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { storeUser, clearAuth, getStoredUser, getPersistedStoreId } from '@/utils/auth';
import { logError } from '@/utils/logError';

/**
 * Hook de autenticação.
 * Expõe: user, login(), logout()
 */
export function useAuth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Usuário atual (lido do localStorage sincronamente)
  const user = getStoredUser();

  /**
   * Faz login do usuário.
   * Em caso de sucesso, armazena dados e redireciona para /area-cliente.
   * Em caso de `needs_set_password`, redireciona para /criar-senha.
   */
  const login = async (email, password, storeId = null) => {
    setLoading(true);
    setError(null);

    // Se não veio storeId pela URL, usa o que estava persistido de uma visita anterior
    const effectiveStoreId = storeId ?? getPersistedStoreId();

    try {
      const body = { email, password };
      if (effectiveStoreId != null) body.store_id = effectiveStoreId;
      const response = await api.post('/auth/login', body);
      if (response.data.success) {
        storeUser(response.data.user, response.data.token);
        navigate('/area-cliente');
      }
    } catch (err) {
      if (err.response?.status === 401 && err.response?.data?.needs_set_password) {
        const storeParam = effectiveStoreId != null ? `&store_id=${effectiveStoreId}` : '';
        navigate(`/criar-senha?email=${encodeURIComponent(email)}${storeParam}`);
      } else {
        const message = err.response?.data?.error || 'Ocorreu um erro ao fazer login.';
        setError(message);
        logError('useAuth.js', 'login', message);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Faz logout do usuário.
   * Chama o endpoint de logout, limpa localStorage e redireciona para /login.
   */
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignora erros no logout — limpa localmente de qualquer forma
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  return { user, login, logout, loading, error, setError };
}
