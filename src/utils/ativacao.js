/**
 * Código de ativação do app à espera de login — dono único.
 *
 * O cliente abre `/ativar?code=ABCD-EFGH` (o QR do app) sem estar logado. Até
 * voltar logado ele pode passar pelo login, pelo "Primeiro acesso" ou pelo
 * "Esqueci a senha" — este último volta pelo link do e-mail, muitas vezes em
 * outra aba. Um parâmetro na URL não atravessa esse caminho; o `localStorage`
 * atravessa. Quem lê o pendente para voltar é o `ProtectedRoute`, por onde
 * passa todo login bem-sucedido.
 *
 * O prazo é o do próprio código (10 min). Depois dele o código já expirou no
 * servidor, e voltar à `/ativar` só mostraria "expirado".
 *
 * Doc: docs/modules/area-membros/changes/2026-10-13-direito-de-acesso-por-conta/design.md (T8)
 */

const ATIVACAO_KEY = 'ativacaoPendente';
const PRAZO_MS = 10 * 60 * 1000;

export function guardarAtivacaoPendente(code) {
  if (!code) return;
  try {
    localStorage.setItem(ATIVACAO_KEY, JSON.stringify({ code, ate: Date.now() + PRAZO_MS }));
  } catch {
    // Sem localStorage o cliente volta ao QR na mão; o login segue funcionando.
  }
}

/** @returns {string | null} o código pendente dentro do prazo, ou null */
export function lerAtivacaoPendente() {
  try {
    const salvo = JSON.parse(localStorage.getItem(ATIVACAO_KEY) || 'null');
    if (salvo?.code && Date.now() < salvo.ate) return salvo.code;
    if (salvo) localStorage.removeItem(ATIVACAO_KEY);
  } catch {
    // Valor corrompido conta como ausente.
  }
  return null;
}

export function limparAtivacaoPendente() {
  try {
    localStorage.removeItem(ATIVACAO_KEY);
  } catch {
    // ignora
  }
}
