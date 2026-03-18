import { Loader2 } from 'lucide-react';

/**
 * Spinner de loading centralizado na tela.
 *
 * @param {string} [message] - Mensagem opcional abaixo do spinner
 */
export function LoadingSpinner({ message = 'Carregando...' }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
      <Loader2 aria-hidden="true" className="h-8 w-8 animate-spin text-amber-500" />
      {message && <span className="text-sm">{message}</span>}
    </div>
  );
}
