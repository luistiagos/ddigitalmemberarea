const LOG_ERR_URL = 'https://digitalstoregames.pythonanywhere.com/logErr';
const PROJECT = 'digitalmemberarea.digitalstoregames.com';

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
