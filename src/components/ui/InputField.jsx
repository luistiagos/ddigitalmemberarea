import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Campo de input reutilizável com suporte a ícone, label e mensagem de erro.
 *
 * @param {string} id - ID do input (usado no label htmlFor)
 * @param {string} label - Texto do label
 * @param {React.ReactNode} icon - Ícone à esquerda do campo
 * @param {string} error - Mensagem de erro (se houver)
 * @param {boolean} showPasswordToggle - Exibe botão olho para campos de senha
 */
export function InputField({
  id,
  label,
  icon: Icon,
  error,
  showPasswordToggle = false,
  type = 'text',
  className = '',
  ...inputProps
}) {
  const [showPassword, setShowPassword] = useState(false);
  const inputType = showPasswordToggle
    ? showPassword ? 'text' : 'password'
    : type;

  const errorId = id && error ? `${id}-error` : undefined;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        {/* Ícone à esquerda */}
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            <Icon className="h-4 w-4 text-white" />
          </div>
        )}

        <input
          id={id}
          type={inputType}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId}
          {...inputProps}
          className={`
            w-full rounded-lg border py-3 text-sm text-white placeholder-gray-500
            bg-gray-800/80 backdrop-blur-sm
            ${Icon ? 'pl-10' : 'pl-4'}
            ${showPasswordToggle ? 'pr-11' : 'pr-4'}
            ${error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
              : 'border-gray-700 focus:border-green-500 focus:ring-green-500/30'
            }
            focus:outline-none focus:ring-2 transition-colors duration-150
            ${className}
          `}
        />

        {/* Botão mostrar/ocultar senha */}
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Mensagem de erro */}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-400 mt-1 animate-fade-in-fast">{error}</p>
      )}
    </div>
  );
}
