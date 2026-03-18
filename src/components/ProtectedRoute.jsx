import { Navigate } from 'react-router-dom';
import { isAuthenticated, clearAuth, getStoredUser } from '@/utils/auth';

/**
 * Componente de rota protegida.
 * Redireciona para /login se o usuário não estiver autenticado ou com token expirado.
 * Limpa o localStorage quando o token expirou para evitar estado inconsistente.
 *
 * Uso:
 *   <Route path="/area-cliente" element={<ProtectedRoute><CustomerArea /></ProtectedRoute>} />
 */
export function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    // Se há dados de usuário mas o token expirou, limpa o estado antes de redirecionar
    if (getStoredUser()) clearAuth();
    return <Navigate to="/login" replace />;
  }
  return children;
}
