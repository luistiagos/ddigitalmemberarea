import { useEffect, useState } from 'react';
import { ExternalLink, Lock, Unlock, Plus, Check, CheckCircle2, Eye } from 'lucide-react';
import ProductPreviewModal from '@/components/ProductPreviewModal';
import UnifiedPaymentModal from '@/components/UnifiedPaymentModal';
import { TRANSLATIONS } from '@/pages/translations';
import { formatCurrency, normalizeCurrency } from '@/utils/memberAreaPricing';
import { getEffectiveProductImage, MULTIGAMES_FALLBACK } from '@/utils/productImages';

function ProductArtworkStage({ imgSrc, title, onImageError, children }) {
  return (
    <div
      data-artwork-stage="true"
      className="relative w-full aspect-[16/10] bg-white border-b border-slate-200/80 overflow-hidden shrink-0"
    >
      <img
        src={imgSrc}
        alt={title}
        onError={onImageError}
        className="w-full h-full object-contain p-3 transition-transform duration-300 group-hover:scale-[1.03]"
      />
      {children}
    </div>
  );
}

/**
 * Card de produto para a área do cliente (Dark Gaming Premium).
 */
export function ProductCard({
  product,
  userEmail = '',
  storeId = null,
  lang = 'ptbr',
  storeCurrency = 'BRL',
  featuredHorizontal = false,
  isInCombo = false,
  onToggleCombo,
  onPreview,
  onUnlock,
  onAccess,
  onPaymentFlowClosed,
}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ptbr;
  const { productid, title, image, owned, price, relprice, description, deliverlink } = product;
  const currency = normalizeCurrency(product.currency || storeCurrency);
  const effectiveImage = getEffectiveProductImage(title, image);
  const [imgSrc, setImgSrc] = useState(effectiveImage);
  const [localPreviewOpen, setLocalPreviewOpen] = useState(false);
  const [localPayOpen, setLocalPayOpen] = useState(false);

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
          className="group flex flex-col md:flex-row rounded-2xl border border-emerald-400/50 bg-[#1e293b] overflow-hidden animate-fade-in transition-all duration-200 hover:border-emerald-300/80 shadow-xl shadow-slate-950/50"
        >
          <div className="md:w-80 lg:w-96 shrink-0">
            <ProductArtworkStage imgSrc={imgSrc} title={title} onImageError={handleImgError} />
          </div>

          <div className="flex flex-col flex-1 p-5 sm:p-6 justify-between gap-4">
            <div className="space-y-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t.ownedLifetimeBadge}
              </span>
              <h2 className="font-bold text-white text-lg sm:text-xl leading-snug">{title}</h2>
              <p className="text-sm text-slate-200">{t.ownedSingleTagline}</p>
            </div>

            <div>
              {deliverlink ? (
                <a
                  href={deliverlink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => onAccess?.(product)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 active:from-emerald-700 active:to-green-700 text-white font-bold text-sm py-3 px-7 transition-all w-full sm:w-auto no-underline shadow-lg shadow-emerald-950/40"
                >
                  <ExternalLink className="h-4 w-4 shrink-0 text-white" />
                  <span>{t.accessBtn}</span>
                </a>
              ) : (
                <span className="text-xs text-slate-300 italic">{t.noAccessLink}</span>
              )}
            </div>
          </div>
        </article>
      );
    }

    return (
      <article className="group flex flex-col rounded-2xl border border-slate-600/80 bg-[#1e293b] overflow-hidden animate-fade-in transition-all duration-200 hover:border-emerald-400/70 shadow-lg shadow-slate-950/40">
        <ProductArtworkStage imgSrc={imgSrc} title={title} onImageError={handleImgError}>
          <span className="absolute top-3 left-3 z-20 inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-slate-900/90 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 shadow">
            <CheckCircle2 className="h-3 w-3" />
            {t.ownedLifetimeBadge}
          </span>
        </ProductArtworkStage>

        <div className="flex flex-col flex-1 p-4 gap-3">
          <h2 className="font-semibold text-white text-sm leading-tight line-clamp-2">{title}</h2>
          <p className="text-xs text-slate-200">{t.enjoyMsg}</p>
          <div className="mt-auto">
            {deliverlink ? (
              <a
                href={deliverlink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onAccess?.(product)}
                className="inline-flex items-center gap-2 justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 active:from-emerald-700 active:to-green-700 text-white font-bold text-sm py-2.5 px-6 transition-all w-full no-underline shadow-md"
              >
                <ExternalLink className="h-4 w-4 shrink-0 text-white" />
                <span>{t.accessBtn}</span>
              </a>
            ) : (
              <span className="text-xs text-slate-300 italic">{t.noAccessLink}</span>
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
        className={`group flex flex-col rounded-2xl border overflow-hidden animate-fade-in transition-all duration-200 bg-[#1e293b] shadow-lg shadow-slate-950/40 ${
          isInCombo
            ? 'border-cyan-400 shadow-cyan-500/15'
            : 'border-slate-600/80 hover:border-amber-400/80 hover:shadow-amber-500/10'
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
          <ProductArtworkStage imgSrc={imgSrc} title={title} onImageError={handleImgError}>
            {/* Selo discreto no canto superior esquerdo */}
            <span className="absolute top-3 left-3 z-20 inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/90 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-medium text-slate-100 shadow">
              <Lock className="h-3 w-3 text-amber-400" />
              <span>{t.lockedBadge}</span>
            </span>

            {/* Badge de desconto no canto superior direito */}
            {discount && (
              <span className="absolute top-3 right-3 z-20 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-0.5 text-xs font-extrabold text-slate-950 shadow">
                -{discount}%
              </span>
            )}

            {/* Indicador discreto de Preview ao passar o mouse */}
            <span className="absolute bottom-2.5 right-3 z-20 inline-flex items-center gap-1 rounded-md bg-slate-900/90 px-2 py-0.5 text-[11px] text-slate-100 opacity-0 group-hover:opacity-100 transition-opacity shadow">
              <Eye className="h-3 w-3 text-cyan-300" />
              <span>{t.previewDetailsHint}</span>
            </span>
          </ProductArtworkStage>
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
                    ? 'border-cyan-300 bg-cyan-500/25 text-cyan-100'
                    : 'border-slate-500/70 bg-slate-900/70 text-slate-100 hover:border-cyan-400 hover:text-white'
                }`}
              >
                {isInCombo ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                <span>{isInCombo ? t.inComboBtn : t.addToComboBtn}</span>
              </button>
            )}
          </div>

          {description && (
            <p className="text-xs text-slate-200 leading-relaxed line-clamp-2">{description}</p>
          )}

          {displayPrice != null && (
            <div className="flex items-baseline gap-2 flex-wrap mt-auto">
              {displayRelPrice && displayRelPrice > displayPrice && (
                <span className="text-xs text-slate-400 line-through">
                  {formatCurrency(displayRelPrice, currency, lang)}
                </span>
              )}
              <span className="text-lg font-extrabold text-white">
                {formatCurrency(displayPrice, currency, lang)}
              </span>
              {discount && (
                <span className="text-xs text-emerald-300 font-semibold">
                  {t.economyLabel} {formatCurrency(displayRelPrice - displayPrice, currency, lang)}
                </span>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (onUnlock) {
                onUnlock(product);
              } else {
                setLocalPayOpen(true);
              }
            }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:from-amber-600 active:to-orange-600 text-slate-950 font-extrabold text-sm py-2.5 px-4 transition-all shadow-md shadow-amber-950/30"
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
            if (onUnlock) {
              onUnlock(p);
            } else {
              setLocalPayOpen(true);
            }
          }}
        />
      )}

      {!onUnlock && (
        <UnifiedPaymentModal
          isOpen={localPayOpen}
          onClose={() => setLocalPayOpen(false)}
          items={[product]}
          discountPct={0}
          currency={currency}
          userEmail={userEmail}
          storeId={storeId}
          lang={lang}
          onPaymentComplete={() => {
            setLocalPayOpen(false);
            onPaymentFlowClosed?.();
          }}
        />
      )}
    </>
  );
}
