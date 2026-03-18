import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

const configs = {
  error: {
    container: 'bg-red-500/10 border-red-500/30 text-red-400',
    Icon: AlertCircle,
  },
  success: {
    container: 'bg-green-500/10 border-green-500/30 text-green-400',
    Icon: CheckCircle2,
  },
  info: {
    container: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    Icon: Info,
  },
  warning: {
    container: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    Icon: AlertTriangle,
  },
};

/**
 * Componente de alerta padronizado.
 *
 * @param {'error' | 'success' | 'info' | 'warning'} variant
 * @param {string} message
 * @param {() => void} [onClose] - Se fornecido, exibe botão de fechar
 */
export function Alert({ variant = 'error', message, onClose }) {
  if (!message) return null;

  const { container, Icon } = configs[variant] ?? configs.error;

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm animate-fade-in-fast ${container}`}
    >
      <Icon aria-hidden="true" className="h-4 w-4 mt-0.5 shrink-0" />
      <span className="flex-1">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
