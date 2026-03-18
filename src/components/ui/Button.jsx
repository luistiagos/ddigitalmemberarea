import { Loader2 } from 'lucide-react';

/**
 * Botão reutilizável com variantes e estado de loading.
 *
 * @param {'primary' | 'danger' | 'ghost'} variant
 * @param {boolean} loading
 */
export function Button({
  variant = 'primary',
  loading = false,
  disabled = false,
  children,
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const variants = {
    primary:
      'bg-green-500 hover:bg-green-400 active:bg-green-600 text-white focus:ring-green-500 shadow-lg hover:shadow-green-500/25',
    danger:
      'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white focus:ring-red-500',
    ghost:
      'bg-transparent hover:bg-white/10 active:bg-white/20 text-gray-300 hover:text-white focus:ring-white/30 border border-white/20',
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
