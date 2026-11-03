import { useEffect } from 'react';
import { Gamepad2, Loader2 } from 'lucide-react';
import { getToken } from '@/utils/auth';

/**
 * Redireciona o usuario autenticado da area de membros para a pagina
 * de acesso e download de roms em emulators.digitalstoregames.com/acesso/,
 * passando o token JWT para autenticacao imediata.
 */
export function AccessRedirect() {
  useEffect(() => {
    const token = getToken();
    const targetUrl = new URL('https://emulators.digitalstoregames.com/acesso/');
    if (token) {
      targetUrl.searchParams.set('token', token);
    }
    window.location.href = targetUrl.toString();
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20 animate-pulse">
        <Gamepad2 className="h-8 w-8 text-white" />
      </div>
      <h1 className="text-xl font-bold text-white mb-2">Acessando Catalogo de Jogos &amp; ROMs...</h1>
      <p className="text-sm text-gray-400 max-w-sm mb-6">
        Carregando seus sistemas liberados e preparando a area de downloads.
      </p>
      <div className="flex items-center gap-2 text-purple-400 text-xs">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Redirecionando com seguranca...</span>
      </div>
    </div>
  );
}

