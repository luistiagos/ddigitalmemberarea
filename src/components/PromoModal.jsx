import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Sparkles, Tag, Unlock, X } from 'lucide-react';
import UnifiedPaymentModal from '@/components/UnifiedPaymentModal';
import ProductArtworkStage from '@/components/ProductArtworkStage';
import { TRANSLATIONS } from '@/pages/translations';
import {
  formatCurrency,
  resolveCatalogCurrency,
  round2,
  roundDiscountedItemPrice,
} from '@/utils/memberAreaPricing';
import { getEffectiveProductImage, MULTIGAMES_FALLBACK } from '@/utils/productImages';
import {
  MEMBER_AREA_TELEMETRY_EVENTS,
  trackMemberAreaEvent,
} from '@/utils/memberAreaTelemetry';

function getItemOriginalPrice(item) {
  return Number(item?.price || 0);
}

function getItemDiscountPrice(item, discountPct) {
  if (discountPct === 25 && item?.price_25 != null) return round2(item.price_25);
  if (discountPct === 50 && item?.price_50 != null) return round2(item.price_50);
  return roundDiscountedItemPrice(getItemOriginalPrice(item), discountPct);
}

function PromoProductRow({
  product,
  discountPct,
  currency,
  lang,
  mode,
  selected,
  onSelect,
}) {
  const initialSrc = getEffectiveProductImage(product.title, product.image);
  const [imgSrc, setImgSrc] = useState(initialSrc);

  useEffect(() => {
    setImgSrc(initialSrc);
  }, [initialSrc]);

  const origPrice = getItemOriginalPrice(product);
  const promoPrice = getItemDiscountPrice(product, discountPct);

  return (
    <button
      type="button"
      role={mode === 'radio' ? 'radio' : mode === 'checkbox' ? 'checkbox' : undefined}
      aria-checked={mode === 'fixed' ? undefined : selected}
      data-promo-product-id={product.productid}
      onClick={() => onSelect?.(product.productid)}
      disabled={mode === 'fixed'}
      className={`group w-full text-left flex items-start gap-3 rounded-xl border p-3 transition-all ${
        selected
          ? 'border-amber-400/80 bg-amber-500/15 shadow-sm shadow-amber-500/10'
          : 'border-slate-600/80 bg-slate-900/75 hover:border-slate-400'
      } ${mode === 'fixed' ? 'cursor-default' : 'cursor-pointer'}`}
    >
      <div className="mt-1 shrink-0">
        {mode === 'radio' ? (
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
              selected
                ? 'border-amber-400 bg-amber-400/20'
                : 'border-slate-400 bg-slate-950'
            }`}
          >
            {selected && <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />}
          </span>
        ) : (
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
              selected
                ? 'border-emerald-400 bg-emerald-600 text-white'
                : 'border-slate-500 bg-slate-950 text-transparent'
            }`}
          >
            <Check className="h-3.5 w-3.5 stroke-[3]" />
          </span>
        )}
      </div>

      <div className="w-20 h-14 rounded-lg overflow-hidden shrink-0">
        <ProductArtworkStage
          imgSrc={imgSrc}
          title={product.title}
          onImageError={() => setImgSrc(MULTIGAMES_FALLBACK)}
          aspectClass="h-14 w-20 rounded-lg border border-white/15"
          imagePaddingClass="p-1"
          framed={false}
        />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-semibold text-white leading-snug break-words">
          {product.title}
        </p>
        <div className="flex items-baseline flex-wrap gap-2 text-xs">
          <span className="text-slate-400 line-through">
            {formatCurrency(origPrice, currency, lang)}
          </span>
          <span className="text-sm font-bold text-amber-300">
            {formatCurrency(promoPrice, currency, lang)}
          </span>
        </div>
      </div>
    </button>
  );
}

/**
 * Modal promocional VIP redesenhado para a Área de Membros.
 * - Etapa 1 (25% OFF): itens não adquiridos pré-marcados com opção de desmarcar (mínimo 1).
 * - Etapa 2 (50% OFF): respeita downsellVariant ('full_50' pacote completo vs 'single_50' escolha de 1 item).
 * - Pagamento unificado via UnifiedPaymentModal (BRL dark / USD Stripe).
 */
export default function PromoModal({
  isOpen = true,
  products = [],
  storeId = null,
  userEmail = '',
  currency,
  downsellVariant = 'single_50',
  lang = 'ptbr',
  openSource = 'auto_timer',
  onClose,
  onShown,
  onPaymentComplete,
  onAccepted,
  onRedirect,
}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ptbr;
  const activeCurrency = resolveCatalogCurrency(products, currency);
  const normalizedVariant = downsellVariant === 'full_50' ? 'full_50' : 'single_50';

  const [step, setStep] = useState('25');
  const [selected25Ids, setSelected25Ids] = useState(() => products.map((p) => p.productid));
  const [selectedSingle50Id, setSelectedSingle50Id] = useState(() => products[0]?.productid ?? null);
  const [minWarningVisible, setMinWarningVisible] = useState(false);
  const [checkoutConfig, setCheckoutConfig] = useState(null);

  const wasOpenRef = useRef(false);

  useEffect(() => {
    const openedNow = Boolean(isOpen && products.length > 0);
    if (openedNow && !wasOpenRef.current) {
      setStep('25');
      setSelected25Ids(products.map((p) => p.productid));
      setSelectedSingle50Id(products[0]?.productid ?? null);
      setMinWarningVisible(false);
      setCheckoutConfig(null);

      onShown?.();
      trackMemberAreaEvent(MEMBER_AREA_TELEMETRY_EVENTS.PROMO_MODAL_OPEN, {
        store_id: storeId,
        downsell_variant: normalizedVariant,
        currency: activeCurrency,
        item_count: products.length,
        source: openSource,
      });
    }
    wasOpenRef.current = openedNow;
  }, [isOpen, products, storeId, normalizedVariant, activeCurrency, openSource, onShown]);

  const dismissOffer = useCallback((action = 'dismiss') => {
    trackMemberAreaEvent(MEMBER_AREA_TELEMETRY_EVENTS.PROMO_STEP_ACTION, {
      store_id: storeId,
      step,
      action,
      discount_pct: step === '25' ? 25 : 50,
      downsell_variant: step === '50' ? normalizedVariant : undefined,
      currency: activeCurrency,
    });
    onClose?.();
  }, [storeId, step, normalizedVariant, activeCurrency, onClose]);

  useEffect(() => {
    if (!isOpen || checkoutConfig || typeof window === 'undefined') return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        dismissOffer('dismiss');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, checkoutConfig, dismissOffer]);

  const selected25Items = useMemo(() => {
    const idSet = new Set(selected25Ids);
    const filtered = products.filter((p) => idSet.has(p.productid));
    return filtered.length > 0 ? filtered : products.slice(0, 1);
  }, [products, selected25Ids]);

  const selected50Items = useMemo(() => {
    if (normalizedVariant === 'full_50') return products;
    const match = products.find((p) => p.productid === selectedSingle50Id);
    return match ? [match] : products.slice(0, 1);
  }, [products, normalizedVariant, selectedSingle50Id]);

  if (!isOpen || products.length === 0) return null;

  if (checkoutConfig) {
    return (
      <UnifiedPaymentModal
        isOpen
        onClose={() => {
          setCheckoutConfig(null);
          onClose?.();
        }}
        items={checkoutConfig.items}
        discountPct={checkoutConfig.discountPct}
        currency={activeCurrency}
        userEmail={userEmail}
        storeId={storeId}
        lang={lang}
        origin="promo_modal"
        downsellVariant={checkoutConfig.downsellVariant}
        onRedirect={onRedirect || onAccepted}
        onPaymentComplete={() => {
          setCheckoutConfig(null);
          onPaymentComplete?.();
        }}
      />
    );
  }

  const is25 = step === '25';
  const discountPct = is25 ? 25 : 50;
  const activeItems = is25 ? selected25Items : selected50Items;
  const subtotalShown = round2(activeItems.reduce((sum, p) => sum + getItemOriginalPrice(p), 0));
  const totalShown = round2(activeItems.reduce((sum, p) => sum + getItemDiscountPrice(p, discountPct), 0));
  const savingsShown = round2(Math.max(0, subtotalShown - totalShown));

  const titleText = is25
    ? t.promoTitle25
    : normalizedVariant === 'full_50'
      ? (t.promoTitle50Full || t.promoTitle50)
      : (t.promoTitle50Single || t.promoTitle50);

  const subtitleText = is25
    ? t.promoSubtitle25
    : normalizedVariant === 'full_50'
      ? (t.promoSubtitle50Full || t.promoSubtitle50)
      : (t.promoSubtitle50Single || t.promoSubtitle50);

  const hintText = is25
    ? t.promoSelectHint25
    : normalizedVariant === 'full_50'
      ? t.promoSelectHint50Full
      : t.promoSelectHint50Single;

  const ctaText = is25
    ? t.promoCta25.replace('{discount}', '25%')
    : normalizedVariant === 'full_50'
      ? (t.promoCta50Full || t.promoCta50).replace('{discount}', '50%')
      : (t.promoCta50Single || t.promoCta50).replace('{discount}', '50%');

  const toggle25Item = (productId) => {
    setSelected25Ids((prev) => {
      if (prev.includes(productId)) {
        if (prev.length <= 1) {
          setMinWarningVisible(true);
          return prev;
        }
        setMinWarningVisible(false);
        return prev.filter((id) => id !== productId);
      }
      setMinWarningVisible(false);
      return [...prev, productId];
    });
  };

  const handleDecline25 = () => {
    trackMemberAreaEvent(MEMBER_AREA_TELEMETRY_EVENTS.PROMO_STEP_ACTION, {
      store_id: storeId,
      step: '25',
      action: 'decline',
      discount_pct: 25,
      item_count: selected25Items.length,
      currency: activeCurrency,
    });
    setMinWarningVisible(false);
    setStep('50');
  };

  const handleAccept = () => {
    trackMemberAreaEvent(MEMBER_AREA_TELEMETRY_EVENTS.PROMO_STEP_ACTION, {
      store_id: storeId,
      step,
      action: 'accept',
      discount_pct: discountPct,
      downsell_variant: is25 ? undefined : normalizedVariant,
      item_count: activeItems.length,
      currency: activeCurrency,
    });
    setCheckoutConfig({
      items: activeItems,
      discountPct,
      downsellVariant: is25 ? undefined : normalizedVariant,
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismissOffer('dismiss');
      }}
    >
      <div className="flex min-h-full items-center justify-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="promo-modal-title"
          data-testid="promo-modal-dialog"
          className="relative w-full max-w-2xl rounded-2xl border border-indigo-400/25 bg-[#1e293b] text-white shadow-2xl overflow-hidden animate-fade-in"
        >
          {/* Barra de destaque superior */}
          <div
            className={`h-1.5 w-full ${
              is25
                ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500'
                : 'bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-400'
            }`}
          />

          {/* Botao explicito de fechar (X) */}
          <button
            type="button"
            aria-label={t.promoCloseLabel || t.close}
            onClick={() => dismissOffer('dismiss')}
            className="absolute top-4 right-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-gray-900/80 text-gray-400 hover:text-white hover:border-white/25 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-6 sm:p-7 space-y-5">
            {/* Cabecalho */}
            <div className="pr-10 space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/35 bg-amber-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{t.promoBannerBadge} · {discountPct}% OFF</span>
              </div>
              <h2 id="promo-modal-title" className="text-xl sm:text-2xl font-extrabold text-white leading-tight">
                {titleText}
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed">
                {subtitleText}
              </p>
            </div>

            {/* Instrucao + contador de selecao */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs font-medium text-gray-300">{hintText}</p>
              {t.promoSelectedCount && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-900 border border-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                  <Tag className="h-3 w-3" />
                  <span>{t.promoSelectedCount.replace('{count}', String(activeItems.length))}</span>
                </span>
              )}
            </div>

            {minWarningVisible && (
              <p role="status" className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                {t.promoMinOneWarning}
              </p>
            )}

            {/* Lista em grade ampla sem truncamento nos titulos */}
            <div
              role={is25 ? 'group' : normalizedVariant === 'single_50' ? 'radiogroup' : 'list'}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[42vh] overflow-y-auto pr-1"
            >
              {products.map((product) => {
                const mode = is25
                  ? 'checkbox'
                  : normalizedVariant === 'single_50'
                    ? 'radio'
                    : 'fixed';
                const isSelected = is25
                  ? selected25Items.some((p) => p.productid === product.productid)
                  : normalizedVariant === 'single_50'
                    ? selected50Items[0]?.productid === product.productid
                    : true;

                return (
                  <PromoProductRow
                    key={product.productid}
                    product={product}
                    discountPct={discountPct}
                    currency={activeCurrency}
                    lang={lang}
                    mode={mode}
                    selected={isSelected}
                    onSelect={
                      is25
                        ? toggle25Item
                        : normalizedVariant === 'single_50'
                          ? (id) => setSelectedSingle50Id(id)
                          : undefined
                    }
                  />
                );
              })}
            </div>

            {/* Resumo financeiro e acoes */}
            <div className="rounded-xl border border-slate-600/80 bg-slate-900/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-slate-300">{t.promoTotalWithDiscount}</p>
                <div className="flex items-baseline gap-2.5 flex-wrap mt-0.5">
                  <span className="text-sm text-slate-400 line-through">
                    {formatCurrency(subtotalShown, activeCurrency, lang)}
                  </span>
                  <span className="text-2xl font-extrabold text-amber-300">
                    {formatCurrency(totalShown, activeCurrency, lang)}
                  </span>
                  {savingsShown > 0 && (
                    <span className="text-xs font-semibold text-emerald-300">
                      ({t.economyLabel} {formatCurrency(savingsShown, activeCurrency, lang)})
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleAccept}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:from-amber-600 active:to-orange-600 text-slate-950 font-extrabold text-sm px-6 py-3 transition-all shadow-lg shadow-amber-950/30"
                >
                  <Unlock className="h-4 w-4" />
                  <span>{ctaText}</span>
                </button>
                <button
                  type="button"
                  onClick={is25 ? handleDecline25 : () => dismissOffer('dismiss')}
                  className="text-xs font-medium text-slate-300 hover:text-white transition-colors py-1"
                >
                  {is25 ? t.promoDecline25 : t.promoDecline50}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
