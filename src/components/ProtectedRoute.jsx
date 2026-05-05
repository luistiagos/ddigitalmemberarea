import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, clearAuth, getStoredUser } from '@/utils/auth';

/**
 * Componente de rota protegida.
 *
 * Regras:
 * 1. Não autenticado → /login preservando query params (store_id segue junto).
 * 2. Autenticado mas URL tem store_id diferente do JWT → logout + /login?store_id=
 *    Cada loja é independente; sessão de loja A não dá acesso à loja B.
 */
export function ProtectedRoute({ children }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const rawUrlStoreId = searchParams.get('store_id') || searchParams.get('storeid');
  const urlStoreId = rawUrlStoreId ? Number(rawUrlStoreId) : null;

  if (!isAuthenticated()) {
    if (getStoredUser()) clearAuth();
    return <Navigate to={`/login${location.search}`} replace />;
  }

  // Logout when URL requests a different store than the active session.
  // Each store is fully independent — no cross-store session reuse.
  if (urlStoreId != null) {
    const user = getStoredUser();
    const sessionStoreId = user?.storeId ?? null;
    if (sessionStoreId != null && sessionStoreId !== urlStoreId) {
      clearAuth();
      return <Navigate to={`/login${location.search}`} replace />;
    }
  }

  return children;
}
