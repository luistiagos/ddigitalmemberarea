import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { storeUser, clearAuth, getStoredUser, getPersistedStoreId, persistStoreId } from '@/utils/auth';
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

    // Explicit storeId from URL wins; only fall back to persisted value when absent
    const effectiveStoreId = storeId ?? getPersistedStoreId();

    // Persist before the API call so it's available even if the call fails mid-flight
    if (storeId != null) persistStoreId(storeId);

    try {
      const body = { email, password };
      if (effectiveStoreId != null) body.store_id = effectiveStoreId;
      const response = await api.post('/auth/login', body);
      if (response.data.success) {
        storeUser(response.data.user, response.data.token);
        // Navigate with store_id in URL so CustomerArea can detect a store switch
        const dest = effectiveStoreId != null
          ? `/area-cliente?store_id=${effectiveStoreId}`
          : '/area-cliente';
        navigate(dest);
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
      // Limpa flags de sessão para que o próximo login comece com estado limpo.
      // Sem isso, o PromoModal nunca aparece numa nova sessão no mesmo tab porque
      // o sessionStorage NÃO é destruído pelo logout — só quando o tab é fechado.
      sessionStorage.removeItem('promoModalShownThisSession');
      sessionStorage.removeItem('customerAreaNeedsRefresh');
      navigate('/login');
    }
  };

  return { user, login, logout, loading, error, setError };
}
