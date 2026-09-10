const LOG_ERR_URL = 'https://digitalstoregames.pythonanywhere.com/logErr';
const PROJECT = 'digitalmemberarea.digitalstoregames.com';

/**
 * Verifica se um erro retornado por requisição HTTP é um erro do cliente/usuário
 * (4xx: validação de negócio, credenciais inválidas, token expirado/já utilizado, etc.).
 * Erros 4xx são esperados pelo fluxo de negócio e NÃO devem poluir o log de erros do sistema.
 *
 * @param {*} err - Objeto de erro (tipicamente AxiosError).
 * @returns {boolean} true se for erro 4xx (400–499).
 */
export function isUserError(err) {
  const status = err?.response?.status;
  return typeof status === 'number' && status >= 400 && status < 500;
}

/**
 * Registra um erro de frontend no backend (fire-and-forget).
 * Nunca lança exceção — falhas de rede são silenciosas.
 *
 * @param {string} file    - Nome do arquivo onde o erro ocorreu (ex: 'useAuth.js').
 * @param {string} method  - Nome da função/método onde o erro ocorreu.
 * @param {*}      message - Mensagem de erro (Error, string, etc.).
 */
export function logError(file, method, message) {
  try {
    const params = new URLSearchParams({
      file,
      method,
      message: message instanceof Error ? message.message : String(message),
      user_agent: navigator.userAgent || '',
      platform: navigator.platform || '',
      screen: `${window.screen?.width || ''}x${window.screen?.height || ''}`,
      page_url: window.location.href || '',
      project: PROJECT,
    });
    fetch(`${LOG_ERR_URL}?${params.toString()}`).catch(() => {});
  } catch {
    // ignora qualquer falha no log — não deve impactar o fluxo principal
  }
}

/**
 * Registra um erro de chamada de API/HTTP no backend, filtrando erros de usuário/validação (4xx).
 * Se o erro for 4xx (isUserError), não faz log.
 * Caso contrário (5xx do servidor, erro de rede/sem resposta, etc.), formata o diagnóstico e envia via logError.
 *
 * @param {string} file        - Nome do arquivo onde o erro ocorreu.
 * @param {string} method      - Nome da função/método onde o erro ocorreu.
 * @param {*}      err         - Objeto de erro capturado (ex: AxiosError).
 * @param {string} userMessage - Mensagem exibida ao usuário final.
 */
export function logApiError(file, method, err, userMessage = '') {
  if (isUserError(err)) {
    return;
  }
  const httpStatus = err?.response?.status ?? 'no_response';
  const originalMsg = err?.message || String(err);
  const diagMessage = `[HTTP ${httpStatus}] ${originalMsg}${userMessage ? ` | user_msg: ${userMessage}` : ''}`;
  logError(file, method, diagMessage);
}
