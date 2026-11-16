import { useEffect, useState } from 'react';
import { ExternalLink, Lock, Unlock, Plus, Check, CheckCircle2, Eye } from 'lucide-react';
import ProductPreviewModal from '@/components/ProductPreviewModal';
import { TRANSLATIONS } from '@/pages/translations';
import { formatCurrency, normalizeCurrency } from '@/utils/memberAreaPricing';
import { getEffectiveProductImage, MULTIGAMES_FALLBACK } from '@/utils/productImages';

function AmbientArtwork({ imgSrc, title, onImageError, dim = false, children }) {
  return (
    <div className="relative w-full aspect-[16/10] bg-gray-950 overflow-hidden shrink-0">
      <img
        src={imgSrc}
        alt=""
        aria-hidden="true"
        data-ambient-backdrop="true"
        className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-45"
      />
      <img
        src={imgSrc}
        alt={title}
        onError={onImageError}
        className={`relative z-10 w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03] ${
          dim ? 'opacity-90' : ''
        }`}
      />
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-[#111827]/90 via-transparent to-transparent pointer-events-none" />
      {children}
    </div>
  );
}

/**
 * Card de produto para a área do cliente (Dark Gaming Premium).
 */
export function ProductCard({
  product,
  lang = 'ptbr',
  storeCurrency = 'BRL',
  featuredHorizontal = false,
  isInCombo = false,
  onToggleCombo,
  onPreview,
  onUnlock,
}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ptbr;
  const { productid, title, image, owned, price, relprice, description, deliverlink } = product;
  const currency = normalizeCurrency(product.currency || storeCurrency);
  const effectiveImage = getEffectiveProductImage(title, image);
  const [imgSrc, setImgSrc] = useState(effectiveImage);
  const [localPreviewOpen, setLocalPreviewOpen] = useState(false);

  useEffect(() => {
    setImgSrc(effectiveImage);
  }, [effectiveImage]);

  const handleImgError = () => setImgSrc(MULTIGAMES_FALLBACK);

  /* ── Produto adquirido ── */
  if (owned) {
    if (featuredHorizontal) {
      return (
        <article
          data-featured-owned="true"
          className="group flex flex-col md:flex-row rounded-2xl border border-emerald-500/30 bg-[#111827]/95 overflow-hidden animate-fade-in transition-all duration-200 hover:border-emerald-400/60 shadow-xl shadow-emerald-950/20"
        >
          <div className="md:w-80 lg:w-96 shrink-0">
            <AmbientArtwork imgSrc={imgSrc} title={title} onImageError={handleImgError} />
          </div>

          <div className="flex flex-col flex-1 p-5 sm:p-6 justify-between gap-4">
            <div className="space-y-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t.ownedLifetimeBadge}
              </span>
              <h2 className="font-bold text-white text-lg sm:text-xl leading-snug">{title}</h2>
              <p className="text-sm text-gray-400">{t.ownedSingleTagline}</p>
            </div>

            <div>
              {deliverlink ? (
                <a
                  href={deliverlink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-gray-950 font-bold text-sm py-3 px-7 transition-colors w-full sm:w-auto no-underline shadow-lg shadow-emerald-500/20"
                >
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  <span>{t.accessBtn}</span>
                </a>
              ) : (
                <span className="text-xs text-gray-500 italic">{t.noAccessLink}</span>
              )}
            </div>
          </div>
        </article>
      );
    }

    return (
      <article className="group flex flex-col rounded-2xl border border-white/10 bg-[#111827]/90 overflow-hidden animate-fade-in transition-all duration-200 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10">
        <AmbientArtwork imgSrc={imgSrc} title={title} onImageError={handleImgError}>
          <span className="absolute top-3 left-3 z-20 inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-gray-950/80 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            {t.ownedLifetimeBadge}
          </span>
        </AmbientArtwork>

        <div className="flex flex-col flex-1 p-4 gap-3">
          <h2 className="font-semibold text-white text-sm leading-tight line-clamp-2">{title}</h2>
          <p className="text-xs text-gray-400">{t.enjoyMsg}</p>
          <div className="mt-auto">
            {deliverlink ? (
              <a
                href={deliverlink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 justify-center rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-gray-950 font-bold text-sm py-2.5 px-6 transition-colors w-full no-underline shadow-md"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                <span>{t.accessBtn}</span>
              </a>
            ) : (
              <span className="text-xs text-gray-500 italic">{t.noAccessLink}</span>
            )}
          </div>
        </div>
      </article>
    );
  }

  /* ── Produto não adquirido ── */
  const displayPrice = price != null ? Number(price) : null;
  const displayRelPrice = relprice != null ? Number(relprice) : null;
  const discount =
    displayRelPrice && displayPrice && displayRelPrice > displayPrice
      ? Math.round((1 - displayPrice / displayRelPrice) * 100)
      : null;

  const openPreview = () => {
    if (onPreview) {
      onPreview(product);
    } else {
      setLocalPreviewOpen(true);
    }
  };

  return (
    <>
      <article
        className={`group flex flex-col rounded-2xl border overflow-hidden animate-fade-in transition-all duration-200 bg-[#111827]/90 ${
          isInCombo
            ? 'border-cyan-400/70 shadow-lg shadow-cyan-500/10'
            : 'border-white/10 hover:border-amber-500/45 hover:shadow-lg hover:shadow-amber-500/10'
        }`}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={openPreview}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPreview(); } }}
          aria-label={`${t.previewDetailsHint}: ${title}`}
          className="cursor-pointer focus:outline-none"
        >
          <AmbientArtwork imgSrc={imgSrc} title={title} onImageError={handleImgError} dim>
            {/* Selo discreto no canto superior esquerdo (sem cadeado gigante central) */}
            <span className="absolute top-3 left-3 z-20 inline-flex items-center gap-1 rounded-full border border-white/15 bg-gray-950/80 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-medium text-gray-200">
              <Lock className="h-3 w-3 text-amber-400" />
              <span>{t.lockedBadge}</span>
            </span>

            {/* Badge de desconto no canto superior direito */}
            {discount && (
              <span className="absolute top-3 right-3 z-20 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-extrabold text-gray-950 shadow">
                -{discount}%
              </span>
            )}

            {/* Indicador discreto de Preview ao passar o mouse */}
            <span className="absolute bottom-2.5 right-3 z-20 inline-flex items-center gap-1 rounded-md bg-gray-950/75 px-2 py-0.5 text-[11px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye className="h-3 w-3 text-cyan-300" />
              <span>{t.previewDetailsHint}</span>
            </span>
          </AmbientArtwork>
        </div>

        <div className="flex flex-col flex-1 p-4 gap-3">
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              onClick={openPreview}
              className="text-left font-semibold text-white hover:text-amber-300 text-sm leading-tight line-clamp-2 transition-colors"
            >
              {title}
            </button>

            {onToggleCombo && (
              <button
                type="button"
                onClick={() => onToggleCombo(product)}
                aria-pressed={isInCombo}
                className={`shrink-0 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  isInCombo
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                    : 'border-white/15 bg-gray-800/80 text-gray-300 hover:border-cyan-400/50 hover:text-white'
                }`}
              >
                {isInCombo ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                <span>{isInCombo ? t.inComboBtn : t.addToComboBtn}</span>
              </button>
            )}
          </div>

          {description && (
            <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{description}</p>
          )}

          {displayPrice != null && (
            <div className="flex items-baseline gap-2 flex-wrap mt-auto">
              {displayRelPrice && displayRelPrice > displayPrice && (
                <span className="text-xs text-gray-400 line-through">
                  {formatCurrency(displayRelPrice, currency, lang)}
                </span>
              )}
              <span className="text-lg font-extrabold text-white">
                {formatCurrency(displayPrice, currency, lang)}
              </span>
              {discount && (
                <span className="text-xs text-emerald-400 font-semibold">
                  {t.economyLabel} {formatCurrency(displayRelPrice - displayPrice, currency, lang)}
                </span>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => onUnlock?.(product)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-950 font-bold text-sm py-2.5 px-4 transition-colors shadow-md shadow-amber-500/10"
          >
            <Unlock className="h-4 w-4" />
            <span>
              {t.unlockBtn}
              {displayPrice != null ? ` — ${formatCurrency(displayPrice, currency, lang)}` : ''}
            </span>
          </button>
        </div>
      </article>

      {!onPreview && (
        <ProductPreviewModal
          isOpen={localPreviewOpen}
          onClose={() => setLocalPreviewOpen(false)}
          product={product}
          currency={currency}
          lang={lang}
          isInCombo={isInCombo}
          onToggleCombo={onToggleCombo}
          onUnlock={(p) => {
            setLocalPreviewOpen(false);
            onUnlock?.(p);
          }}
        />
      )}
    </>
  );
}
