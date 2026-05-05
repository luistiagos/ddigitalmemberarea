import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, clearAuth, getStoredUser } from '@/utils/auth';

/**
 * Componente de rota protegida.
 * Redireciona para /login preservando query params (ex.: ?store_id=) da URL atual
 * para que o login page possa repassá-los ao retornar para /area-cliente.
 */
export function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    if (getStoredUser()) clearAuth();
    // Preserve query string so login page can forward store_id back after auth
    const loginDest = `/login${location.search}`;
    return <Navigate to={loginDest} replace />;
  }
  return children;
}
