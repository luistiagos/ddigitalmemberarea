import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, Unlock, Check, Plus, ShieldCheck } from 'lucide-react';
import { TRANSLATIONS } from '@/pages/translations';
import { formatCurrency } from '@/utils/memberAreaPricing';
import { getEffectiveProductImage, MULTIGAMES_FALLBACK } from '@/utils/productImages';

export default function ProductPreviewModal({
  isOpen,
  onClose,
  product,
  currency = 'BRL',
  lang = 'ptbr',
  isInCombo = false,
  onToggleCombo,
  onUnlock,
}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ptbr;
  const effectiveImage = getEffectiveProductImage(product?.title, product?.image);
  const [imgSrc, setImgSrc] = useState(effectiveImage);

  useEffect(() => {
    setImgSrc(effectiveImage);
  }, [effectiveImage]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product || typeof document === 'undefined') return null;

  const displayPrice = product.price != null ? Number(product.price) : null;
  const displayRelPrice = product.relprice != null ? Number(product.relprice) : null;
  const discount =
    displayRelPrice && displayPrice && displayRelPrice > displayPrice
      ? Math.round((1 - displayPrice / displayRelPrice) * 100)
      : null;

  const bullets = Array.isArray(t.previewBullets) ? t.previewBullets : [];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      role="dialog"
      aria-modal="true"
      aria-label={product.title}
    >
      <div
        className="relative w-full max-w-xl bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-3 right-3 z-20 rounded-full bg-black/60 hover:bg-black/80 border border-white/15 p-2 text-gray-300 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Blurred ambient backdrop cover */}
        <div className="relative w-full aspect-[16/10] bg-gray-950 overflow-hidden shrink-0">
          <img
            src={imgSrc}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-45"
          />
          <img
            src={imgSrc}
            alt={product.title}
            onError={() => setImgSrc(MULTIGAMES_FALLBACK)}
            className="relative z-10 w-full h-full object-contain p-3"
          />
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#111827] via-transparent to-transparent" />
          {discount && (
            <span className="absolute top-3 left-3 z-20 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-gray-950 shadow">
              -{discount}% OFF
            </span>
          )}
        </div>

        {/* Details & actions */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <h3 className="text-xl font-bold text-white leading-snug">{product.title}</h3>

          {product.description && (
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          )}

          {bullets.length > 0 && (
            <ul className="space-y-2 rounded-xl border border-white/10 bg-gray-900/70 p-4">
              {bullets.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-xs text-gray-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}

          {displayPrice != null && (
            <div className="flex items-baseline gap-2.5 flex-wrap pt-1">
              {displayRelPrice && displayRelPrice > displayPrice && (
                <span className="text-sm text-gray-400 line-through">
                  {formatCurrency(displayRelPrice, currency, lang)}
                </span>
              )}
              <span className="text-2xl font-extrabold text-white">
                {formatCurrency(displayPrice, currency, lang)}
              </span>
              {discount && (
                <span className="text-xs font-semibold text-emerald-400">
                  {t.economyLabel} {formatCurrency(displayRelPrice - displayPrice, currency, lang)}
                </span>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            {onToggleCombo && (
              <button
                type="button"
                onClick={() => onToggleCombo(product)}
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                  isInCombo
                    ? 'border-cyan-400/60 bg-cyan-500/15 text-cyan-300'
                    : 'border-white/15 bg-gray-800/80 text-gray-200 hover:border-cyan-400/40 hover:text-white'
                }`}
              >
                {isInCombo ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {isInCombo ? t.inComboBtn : t.addToComboBtn}
              </button>
            )}

            <button
              type="button"
              onClick={() => onUnlock?.(product)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-950 font-bold text-sm py-3 px-5 transition-colors shadow-lg shadow-amber-500/15"
            >
              <Unlock className="h-4 w-4" />
              <span>
                {t.unlockBtn}
                {displayPrice != null ? ` — ${formatCurrency(displayPrice, currency, lang)}` : ''}
              </span>
            </button>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>{t.immediateAccess}</span>
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
