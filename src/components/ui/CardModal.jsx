import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Modal reutilizável para formulário de cartão de crédito (MP Brick).
 *
 * Layout:
 *   ┌─────────────────────────────┐  ← header fixo
 *   │ Pagar com Cartão        [✕] │
 *   ├─────────────────────────────┤
 *   │                             │  ← body com scroll
 *   │   [status message]          │
 *   │   <div id={containerId} />  │
 *   │                             │
 *   ├─────────────────────────────┤
 *   │      [footer / botão Voltar]│  ← rodapé fixo (opcional)
 *   └─────────────────────────────┘
 *
 * Props:
 *   isOpen      boolean          — controla visibilidade
 *   onClose     () => void       — chamado ao clicar no ✕ ou no backdrop
 *   title       string           — título do cabeçalho (default "Pagar com Cartão")
 *   containerId string           — id do div onde o Brick será montado
 *   status      '' | 'success' | 'pending' | 'error'
 *   statusMsg   string           — mensagem de status
 *   footer      ReactNode        — conteúdo do rodapé (ex: botão Voltar)
 *   zIndex      number           — z-index do backdrop (default 50)
 */
export default function CardModal({
  isOpen,
  onClose,
  title = 'Pagar com Cartão',
  containerId,
  status = '',
  statusMsg = '',
  footer,
  zIndex = 50,
}) {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    /* Backdrop — clique fora fecha */
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4"
      style={{ zIndex }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Modal box: flex-col com altura máxima */}
      <div
        className="relative w-full max-w-sm bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: 'calc(100dvh - 2rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER FIXO ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 flex-shrink-0 rounded-t-2xl bg-gray-800">
          <h3 className="text-white font-semibold">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="text-gray-400 hover:text-white transition-colors p-1 -mr-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── BODY SCROLLÁVEL ── */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-3">
          {status === 'success' && (
            <p className="text-emerald-400 text-sm text-center font-semibold">{statusMsg}</p>
          )}
          {status === 'pending' && (
            <p className="text-amber-400 text-sm text-center font-semibold">{statusMsg}</p>
          )}
          {status === 'error' && (
            <p className="text-red-400 text-sm text-center">{statusMsg}</p>
          )}
          {/* Container do MP CardPayment Brick */}
          <div id={containerId} />
        </div>

        {/* ── FOOTER FIXO (opcional) ── */}
        {footer && (
          <div className="flex-shrink-0 px-5 pb-4 pt-2 border-t border-gray-700 rounded-b-2xl bg-gray-800">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
