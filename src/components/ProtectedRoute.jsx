import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, clearAuth, getStoredUser, getPersistedStoreId, buildLoginRedirect, isSameStoredAccount } from '@/utils/auth';
import { lerAtivacaoPendente } from '@/utils/ativacao';

export { buildLoginRedirect };

/**
 * Componente de rota protegida.
 *
 * Regras:
 * 1. Não autenticado → /login preservando query params (store_id segue junto) e caminho de retorno (redirect).
 * 2. Autenticado + URL tem store_id diferente do JWT → logout + /login?store_id=&redirect=
 *    (cada loja é independente — sem reuso de sessão entre lojas)
 * 2b. Autenticado + URL tem `email` de OUTRA conta → logout + /login?email=&store_id=
 *    (o link pós-compra diz de quem é a compra; a sessão salva pode ser de outra pessoa)
 * 3. Autenticado + código de ativação do app pendente → /ativar?code=
 *    (todo login termina aqui: senha, "Primeiro acesso" e reset; ver utils/ativacao.js)
 * 4. Autenticado + rota /area-cliente sem store_id em lugar algum → /selecionar-loja
 *    (fallback extremo: usuário multi-loja sem referência de qual loja acessar)
 */
export function ProtectedRoute({ children }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const rawUrlStoreId = searchParams.get('store_id') || searchParams.get('storeid');
  const urlStoreId = rawUrlStoreId ? Number(rawUrlStoreId) : null;

  if (!isAuthenticated()) {
    if (getStoredUser()) clearAuth();
    return <Navigate to={buildLoginRedirect(location)} replace />;
  }

  // O link pós-compra traz o e-mail da compra. Sessão de OUTRA conta no navegador (celular da
  // família, compra anterior com outro e-mail) mostrava a compra com cadeado: tx 64509 caiu na
  // conta de teste "ha..." e viu "0 de 6 produtos adquiridos". O link manda: sai e pede a senha
  // desta conta, com o e-mail já preenchido. Mesma regra do `contaDivergente` do Login.jsx.
  // docs/modules/area-membros/bugs/2026-11-06-link-pos-compra-de-quem-ja-tem-senha-abre-a-sessao-de-outra-conta.md
  const urlEmail = searchParams.get('email');
  if (urlEmail && !isSameStoredAccount(urlEmail)) {
    clearAuth();
    return <Navigate to={buildLoginRedirect(location)} replace />;
  }

  const user = getStoredUser();
  const sessionStoreId = user?.storeId ?? null;

  // Logout when URL requests a different store than the active session.
  if (urlStoreId != null && sessionStoreId != null && sessionStoreId !== urlStoreId) {
    clearAuth();
    return <Navigate to={buildLoginRedirect(location)} replace />;
  }

  // Logged in with an app activation waiting for it: back to /ativar (it clears the pending code).
  const ativacaoPendente = lerAtivacaoPendente();
  if (ativacaoPendente) {
    return <Navigate to={`/ativar?code=${encodeURIComponent(ativacaoPendente)}`} replace />;
  }

  // Fallback: no store_id in URL and none in localStorage → store selector
  // Only applies to /area-cliente, not to /selecionar-loja (avoid infinite loop)
  if (location.pathname === '/area-cliente' && urlStoreId == null) {
    const persistedStoreId = getPersistedStoreId();
    if (!persistedStoreId) {
      return <Navigate to="/selecionar-loja" replace />;
    }
  }

  return children;
}
