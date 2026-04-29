/**
 * Utilitários de autenticação — leitura/escrita do localStorage
 * Centraliza onde os dados de sessão são armazenados.
 */

const USER_EMAIL_KEY = 'userEmail';
const USER_ID_KEY = 'userId';
const TOKEN_KEY = 'authToken';
const STORE_ID_KEY = 'storeId';

/**
 * Lê os dados do usuário armazenados no localStorage.
 * @returns {{ email: string, id: string, storeId: number | null } | null}
 */
export function getStoredUser() {
  const email = localStorage.getItem(USER_EMAIL_KEY);
  const id = localStorage.getItem(USER_ID_KEY);
  if (!email) return null;
  const rawStoreId = localStorage.getItem(STORE_ID_KEY);
  const storeId = rawStoreId ? Number(rawStoreId) : null;
  return { email, id, storeId };
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Salva os dados do usuário no localStorage após login bem-sucedido.
 * @param {{ email: string, id: string | number, storeId?: number | null }} user
 * @param {string | null} token
 */
export function storeUser(user, token) {
  localStorage.setItem(USER_EMAIL_KEY, user.email);
  localStorage.setItem(USER_ID_KEY, String(user.id));
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user.storeId != null) localStorage.setItem(STORE_ID_KEY, String(user.storeId));
}

/**
 * Persiste o storeId no localStorage de forma isolada.
 * Chamado assim que o storeId aparece na URL (antes do login),
 * para que fique disponível em acessos futuros sem query string.
 */
export function persistStoreId(storeId) {
  if (storeId != null) localStorage.setItem(STORE_ID_KEY, String(storeId));
}

/**
 * Lê o storeId persistido, mesmo antes de um login completo.
 */
export function getPersistedStoreId() {
  const raw = localStorage.getItem(STORE_ID_KEY);
  return raw ? Number(raw) : null;
}

/**
 * Remove os dados de sessão do localStorage, mas preserva o storeId.
 * O storeId nunca é apagado — persiste entre sessões para garantir
 * que o próximo login use a loja correta mesmo sem query string.
 */
export function clearAuth() {
  localStorage.removeItem(USER_EMAIL_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(TOKEN_KEY);
  // STORE_ID_KEY é preservado intencionalmente
  sessionStorage.removeItem('promoModalShownThisSession');
}

/**
 * Verifica se o JWT armazenado está expirado, decodificando o payload localmente
 * (sem verificar assinatura — suficiente para decisões de UX).
 * @returns {boolean} true se expirado ou ausente
 */
export function isTokenExpired() {
  const token = getToken();
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // exp é Unix timestamp em segundos; Date.now() em milissegundos
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

/**
 * Verifica se o usuário está autenticado (email presente + token não expirado).
 * @returns {boolean}
 */
export function isAuthenticated() {
  return Boolean(localStorage.getItem(USER_EMAIL_KEY)) && !isTokenExpired();
}
