import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, Gamepad2, Sparkles, Unlock, Trophy, Tag } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProductCard } from '@/components/ProductCard';
import ProductPreviewModal from '@/components/ProductPreviewModal';
import UnifiedPaymentModal from '@/components/UnifiedPaymentModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useProducts } from '@/hooks/useProducts';
import { useLang } from '@/hooks/useLang';
import { getStoredUser, storeUser, persistStoreId } from '@/utils/auth';
import {
  calculateComboSummary,
  formatCurrency,
  resolveCatalogCurrency,
} from '@/utils/memberAreaPricing';
import {
  MEMBER_AREA_TELEMETRY_EVENTS,
  trackMemberAreaEvent,
} from '@/utils/memberAreaTelemetry';
import api from '@/services/api';
import PromoModal from '@/components/PromoModal';

const CUSTOMER_AREA_REFRESH_KEY = 'customerAreaNeedsRefresh';
const PROMO_MODAL_SHOWN_KEY = 'promoModalShownThisSession';

function EmptyState({ t }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center animate-fade-in">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-800 border border-gray-700 mb-5">
        <Package className="h-10 w-10 text-gray-600" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">{t.noProductsTitle}</h2>
      <p className="text-gray-400 text-sm max-w-sm">{t.noProductsDesc}</p>
    </div>
  );
}

export function CustomerArea({ onRedirect, promoDelayMs = 5000 } = {}) {
  const [searchParams] = useSearchParams();
  const { lang, t } = useLang();
  const rawStoreId = searchParams.get('store_id') || searchParams.get('storeid');
  const urlStoreId = rawStoreId ? Number(rawStoreId) : null;

  // Persist store_id from URL immediately — fix for cross-store leakage.
  useEffect(() => {
    if (urlStoreId != null) persistStoreId(urlStoreId);
  }, [urlStoreId]);

  const user = getStoredUser();
  const effectiveStoreId = urlStoreId ?? user?.storeId ?? null;
  const { products, loading, error, refetch } = useProducts(user?.email, effectiveStoreId);

  const [promoData, setPromoData] = useState(null);
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [promoOpenSource, setPromoOpenSource] = useState('auto_timer');
  const [promoSeen, setPromoSeen] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [selectedComboIds, setSelectedComboIds] = useState([]);
  const [previewProduct, setPreviewProduct] = useState(null);
  const [checkoutTarget, setCheckoutTarget] = useState(null);

  const promoTimerRef = useRef(null);
  const promoAutoCancelledRef = useRef(false);
  const viewTelemetrySentRef = useRef(false);

  const cancelPromoAutoOpen = useCallback(() => {
    promoAutoCancelledRef.current = true;
    if (promoTimerRef.current) {
      clearTimeout(promoTimerRef.current);
      promoTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (user?.storeId) return;
    api.post('/auth/refresh')
      .then(({ data }) => {
        if (data.store_id) {
          storeUser({ email: user.email, id: user.id, storeId: data.store_id }, data.token);
          window.location.reload();
        }
      })
      .catch(() => {/* silencioso */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerAutoRefresh = useCallback(() => {
    setIsAutoRefreshing(true);
    refetch();
  }, [refetch]);

  const triggerPageReload = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(CUSTOMER_AREA_REFRESH_KEY);
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    const body = effectiveStoreId ? { store_id: effectiveStoreId } : {};
    api.post('/area-cliente/access', body).catch(() => {});
  }, [effectiveStoreId]);

  // Busca elegibilidade sempre (mesmo se ja abriu antes), mantendo Banner Persistente VIP disponivel
  useEffect(() => {
    const params = effectiveStoreId ? { store_id: effectiveStoreId } : {};
    api.get('/area-cliente/promo', { params })
      .then(({ data }) => {
        if (data?.show && data.products?.length > 0) {
          setPromoData(data);
        } else {
          setPromoData(null);
        }
      })
      .catch(() => {});
  }, [effectiveStoreId]);

  // Timer inteligente de 5s: nunca reabre quando already_shown_in_window === true e cancela ao interagir
  useEffect(() => {
    if (promoTimerRef.current) {
      clearTimeout(promoTimerRef.current);
      promoTimerRef.current = null;
    }

    const alreadyShownInTab =
      typeof sessionStorage !== 'undefined' && Boolean(sessionStorage.getItem(PROMO_MODAL_SHOWN_KEY));

    if (
      !promoData?.show ||
      !(promoData.products?.length > 0) ||
      promoData.already_shown_in_window ||
      promoAutoCancelledRef.current ||
      alreadyShownInTab
    ) {
      return undefined;
    }

    promoTimerRef.current = setTimeout(() => {
      promoTimerRef.current = null;
      if (promoAutoCancelledRef.current) return;
      setPromoOpenSource('auto_timer');
      setPromoModalOpen(true);
    }, promoDelayMs);

    return () => {
      if (promoTimerRef.current) {
        clearTimeout(promoTimerRef.current);
        promoTimerRef.current = null;
      }
    };
  }, [promoData, promoDelayMs]);

  useEffect(() => {
    if (sessionStorage.getItem(CUSTOMER_AREA_REFRESH_KEY) === '1') {
      triggerPageReload();
      return;
    }

    const handleReturnToCustomerArea = () => {
      if (sessionStorage.getItem(CUSTOMER_AREA_REFRESH_KEY) === '1') {
        triggerPageReload();
        return;
      }
      if (document.visibilityState === 'visible') {
        triggerAutoRefresh();
      }
    };

    window.addEventListener('focus', handleReturnToCustomerArea);
    window.addEventListener('pageshow', handleReturnToCustomerArea);
    document.addEventListener('visibilitychange', handleReturnToCustomerArea);

    return () => {
      window.removeEventListener('focus', handleReturnToCustomerArea);
      window.removeEventListener('pageshow', handleReturnToCustomerArea);
      document.removeEventListener('visibilitychange', handleReturnToCustomerArea);
    };
  }, [triggerAutoRefresh, triggerPageReload]);

  useEffect(() => {
    if (!loading && isAutoRefreshing) {
      setIsAutoRefreshing(false);
    }
  }, [loading, isAutoRefreshing]);

  const ownedProducts = useMemo(() => products.filter((p) => p.owned), [products]);
  const availableProducts = useMemo(() => products.filter((p) => !p.owned), [products]);
  const purchasableCount = useMemo(
    () => availableProducts.filter((p) => p.price != null && Number(p.price) > 0).length,
    [availableProducts],
  );
  const promoWindowActive = Boolean(promoData?.show && promoData.products?.length > 0);
  const comboEnabled = promoWindowActive && purchasableCount >= 2;

  useEffect(() => {
    if (!promoWindowActive) {
      setSelectedComboIds((prev) => (prev.length > 0 ? [] : prev));
    }
  }, [promoWindowActive]);
  const storeCurrency = useMemo(
    () => resolveCatalogCurrency(products, promoData?.currency),
    [products, promoData],
  );

  // Dispara telemetria member_area_view uma unica vez quando o catalogo termina de carregar
  useEffect(() => {
    if (loading || error || viewTelemetrySentRef.current) return;
    viewTelemetrySentRef.current = true;
    trackMemberAreaEvent(MEMBER_AREA_TELEMETRY_EVENTS.MEMBER_AREA_VIEW, {
      store_id: effectiveStoreId,
      currency: storeCurrency,
      item_count: products.length,
    });
  }, [loading, error, effectiveStoreId, storeCurrency, products.length]);

  // Filtra selectedComboIds para garantir que apenas itens atualmente nao adquiridos permanecem
  const availableMap = useMemo(() => {
    const map = new Map();
    for (const item of availableProducts) {
      map.set(item.productid, item);
    }
    return map;
  }, [availableProducts]);

  const selectedComboProducts = useMemo(
    () => selectedComboIds.map((id) => availableMap.get(id)).filter(Boolean),
    [selectedComboIds, availableMap],
  );
  const selectedComboSet = useMemo(
    () => new Set(selectedComboProducts.map((p) => p.productid)),
    [selectedComboProducts],
  );
  const comboSummary = useMemo(
    () => calculateComboSummary(selectedComboProducts, purchasableCount),
    [selectedComboProducts, purchasableCount],
  );

  const toggleComboItem = useCallback((product) => {
    if (!product || product.owned) return;
    setSelectedComboIds((prev) =>
      prev.includes(product.productid)
        ? prev.filter((id) => id !== product.productid)
        : [...prev, product.productid],
    );
  }, []);

  const openPreviewWithCancel = useCallback((product) => {
    cancelPromoAutoOpen();
    setPreviewProduct(product);
  }, [cancelPromoAutoOpen]);

  const openCheckoutWithCancel = useCallback((target) => {
    cancelPromoAutoOpen();
    setCheckoutTarget(target);
  }, [cancelPromoAutoOpen]);

  const openPromoFromBanner = useCallback(() => {
    cancelPromoAutoOpen();
    trackMemberAreaEvent(MEMBER_AREA_TELEMETRY_EVENTS.PROMO_BANNER_CLICK, {
      store_id: effectiveStoreId,
      downsell_variant: promoData?.downsell_variant || 'single_50',
      currency: storeCurrency,
      item_count: promoData?.products?.length || 0,
    });
    setPromoOpenSource('banner');
    setPromoModalOpen(true);
  }, [cancelPromoAutoOpen, effectiveStoreId, promoData, storeCurrency]);

  const totalCount = products.length;
  const ownedCount = ownedProducts.length;
  const progressPct = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

  return (
    <AppLayout>
      <div className={comboSummary.count >= 2 ? 'pb-28' : 'pb-6'}>
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap animate-fade-in">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Gamepad2 className="h-7 w-7 text-amber-400" />
              {t.myProductsTitle}
            </h1>
            <p className="mt-1 text-sm text-gray-400">{t.productsTagline}</p>
          </div>
          {isAutoRefreshing && (
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/35 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 animate-pulse">
              {t.updatingProducts}
            </div>
          )}
        </div>

        {/* Barra de progresso da biblioteca */}
        {!loading && !error && totalCount > 0 && (
          <div className="mb-6 rounded-2xl border border-indigo-400/25 bg-[#1e293b]/95 p-4 sm:p-5 shadow-lg shadow-slate-950/40">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Trophy className="h-4 w-4 text-amber-400" />
                <span>{t.libraryProgressTitle}:</span>
                <span className="text-emerald-300">
                  {ownedCount} {t.productsOf} {totalCount} {t.libraryProgressSystems}
                </span>
              </div>
              <span className="text-xs font-bold text-amber-200 bg-amber-500/20 border border-amber-400/40 rounded-full px-2.5 py-0.5">
                {progressPct}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2.5 w-full rounded-full bg-slate-900 overflow-hidden"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-400 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Banner Persistente VIP (mantido disponivel mesmo apos fechar o PromoModal ou em already_shown_in_window) */}
        {promoData?.show && promoData.products?.length > 0 && (
          <div
            data-testid="vip-promo-banner"
            className="mb-8 rounded-2xl border border-amber-400/45 bg-gradient-to-r from-indigo-900/75 via-[#1e293b] to-amber-500/20 p-4 sm:p-5 shadow-lg shadow-slate-950/40 animate-fade-in"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-400/45 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-200">
                  <Tag className="h-3 w-3" />
                  <span>{t.promoBannerBadge}</span>
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  {t.promoBannerTitle}
                </h2>
                <p className="text-xs sm:text-sm text-slate-200">
                  {t.promoBannerSubtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={openPromoFromBanner}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:from-amber-600 active:to-orange-600 text-slate-950 font-extrabold text-sm px-5 py-2.5 transition-all shrink-0 shadow-lg shadow-amber-950/30"
              >
                <Sparkles className="h-4 w-4" />
                <span>{t.promoBannerCta}</span>
              </button>
            </div>
          </div>
        )}

        {loading && <LoadingSpinner message={t.loadingProducts} />}

        {error && !loading && (
          <div className="max-w-lg space-y-3">
            <Alert variant="error" message={error} />
            <Button variant="ghost" onClick={refetch} className="text-sm">
              {t.tryAgain}
            </Button>
          </div>
        )}

        {!loading && !error && products.length === 0 && <EmptyState t={t} />}

        {!loading && !error && products.length > 0 && (
          <div className="space-y-12">
            {ownedProducts.length > 0 && (
              <section>
                <h2 className="text-xs sm:text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  {t.purchasedSection}
                </h2>
                <div className={ownedProducts.length === 1 ? 'grid gap-4 grid-cols-1' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'}>
                  {ownedProducts.map((product) => (
                    <ProductCard
                      key={product.productid ?? product.title}
                      product={product}
                      userEmail={user?.email}
                      storeId={effectiveStoreId ?? 1}
                      lang={lang}
                      storeCurrency={storeCurrency}
                      featuredHorizontal={ownedProducts.length === 1}
                      onAccess={cancelPromoAutoOpen}
                      onPaymentFlowClosed={triggerPageReload}
                    />
                  ))}
                </div>
              </section>
            )}

            {availableProducts.length > 0 && (
              <section>
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <h2 className="text-xs sm:text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    {t.unlockSpecial}
                  </h2>
                  {comboEnabled && (
                    <p className="text-xs text-cyan-300/90 font-medium">{t.comboSubtitleHint}</p>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {availableProducts.map((product) => (
                    <ProductCard
                      key={product.productid ?? product.title}
                      product={product}
                      userEmail={user?.email}
                      storeId={effectiveStoreId ?? 1}
                      lang={lang}
                      storeCurrency={storeCurrency}
                      isInCombo={comboEnabled && selectedComboSet.has(product.productid)}
                      onToggleCombo={comboEnabled ? toggleComboItem : undefined}
                      onPreview={openPreviewWithCancel}
                      onUnlock={(p) => openCheckoutWithCancel({ items: [p], discountPct: 0 })}
                      onPaymentFlowClosed={triggerPageReload}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Barra Flutuante de Combo (15% para 2+ itens / 25% para todos, apenas na janela promo de 24h) */}
      {comboEnabled && comboSummary.count >= 2 && (
        <div
          data-testid="combo-bar"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-4xl rounded-2xl border border-cyan-400/60 bg-[#1e293b]/95 backdrop-blur-md px-4 py-3.5 sm:px-6 shadow-2xl shadow-slate-950/80"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full bg-cyan-500/25 border border-cyan-300/50 px-2.5 py-0.5 text-xs font-bold text-cyan-100">
                {comboSummary.discountPct === 25 ? t.comboBarFullBadge : t.comboBarPartialBadge}
              </span>
              <span className="text-sm font-semibold text-white">
                {comboSummary.count} {t.comboBarSelected}
              </span>
              <span className="text-xs text-slate-300">
                {t.comboBarOf}{' '}
                <span className="line-through text-slate-400">
                  {formatCurrency(comboSummary.subtotal, storeCurrency, lang)}
                </span>{' '}
                {t.comboBarFor}{' '}
                <strong className="text-base font-extrabold text-amber-300">
                  {formatCurrency(comboSummary.total, storeCurrency, lang)}
                </strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                trackMemberAreaEvent(MEMBER_AREA_TELEMETRY_EVENTS.COMBO_BAR_CHECKOUT_CLICK, {
                  store_id: effectiveStoreId,
                  discount_pct: comboSummary.discountPct,
                  item_count: comboSummary.count,
                  currency: storeCurrency,
                });
                openCheckoutWithCancel({
                  items: comboSummary.items,
                  discountPct: comboSummary.discountPct,
                });
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:from-amber-600 active:to-orange-600 text-slate-950 font-extrabold text-sm px-5 py-2.5 transition-all shrink-0 shadow-lg shadow-amber-950/30"
            >
              <Unlock className="h-4 w-4" />
              <span>{t.comboBarUnlockBtn}</span>
            </button>
          </div>
        </div>
      )}

      <ProductPreviewModal
        isOpen={Boolean(previewProduct)}
        onClose={() => setPreviewProduct(null)}
        product={previewProduct}
        currency={storeCurrency}
        lang={lang}
        isInCombo={Boolean(comboEnabled && previewProduct && selectedComboSet.has(previewProduct.productid))}
        onToggleCombo={comboEnabled ? toggleComboItem : undefined}
        onUnlock={(p) => {
          setPreviewProduct(null);
          openCheckoutWithCancel({ items: [p], discountPct: 0 });
        }}
      />

      <UnifiedPaymentModal
        isOpen={Boolean(checkoutTarget)}
        onClose={() => setCheckoutTarget(null)}
        items={checkoutTarget?.items || []}
        discountPct={checkoutTarget?.discountPct || 0}
        currency={storeCurrency}
        userEmail={user?.email || ''}
        storeId={effectiveStoreId ?? 1}
        lang={lang}
        origin="combo_or_catalog"
        onRedirect={onRedirect}
        onPaymentComplete={() => {
          setCheckoutTarget(null);
          setSelectedComboIds([]);
          triggerPageReload();
        }}
      />

      {promoData && (
        <PromoModal
          isOpen={promoModalOpen}
          products={promoData.products}
          storeId={effectiveStoreId ?? null}
          userEmail={user?.email || ''}
          currency={storeCurrency}
          downsellVariant={promoData.downsell_variant || 'single_50'}
          lang={lang}
          openSource={promoOpenSource}
          onRedirect={onRedirect}
          onShown={() => {
            if (!promoSeen) {
              setPromoSeen(true);
              if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem(PROMO_MODAL_SHOWN_KEY, '1');
              }
            }
            const body = effectiveStoreId ? { store_id: effectiveStoreId } : {};
            api.post('/area-cliente/promo-seen', body).catch(() => {});
          }}
          onClose={() => {
            setPromoModalOpen(false);
          }}
          onPaymentComplete={() => {
            setPromoModalOpen(false);
            setPromoData(null);
            triggerPageReload();
          }}
          onAccepted={(url) => {
            setPromoModalOpen(false);
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem(CUSTOMER_AREA_REFRESH_KEY, '1');
            }
            if (onRedirect) {
              onRedirect(url);
            } else if (typeof window !== 'undefined') {
              window.location.href = url;
            }
          }}
        />
      )}
    </AppLayout>
  );
}
