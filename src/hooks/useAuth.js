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
        if (effectiveStoreId != null) {
          navigate(`/area-cliente?store_id=${effectiveStoreId}`);
        } else {
          // No store_id available — let store selector resolve which store to show
          navigate('/selecionar-loja');
        }
      }
    } catch (err) {
      if (err.response?.status === 401 && err.response?.data?.needs_set_password) {
        const storeParam = effectiveStoreId != null ? `&store_id=${effectiveStoreId}` : '';
        navigate(`/criar-senha?email=${encodeURIComponent(email)}${storeParam}`);
      } else {
        const userMessage = err.response?.data?.error || 'Ocorreu um erro ao fazer login.';
        setError(userMessage);

        // Erros de credencial inválida são erros do usuário, não do sistema — não logar
        const isCredentialError = err.response?.status === 401;
        if (!isCredentialError) {
          // Monta mensagem de diagnóstico com contexto completo do erro
          const httpStatus = err.response?.status ?? 'no_response';
          const originalMsg = err.message || String(err);
          const diagMessage = `[HTTP ${httpStatus}] ${originalMsg} | user_msg: ${userMessage}`;
          logError('useAuth.js', 'login', diagMessage);
        }
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
