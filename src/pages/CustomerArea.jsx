import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, Gamepad2, Sparkles } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProductCard } from '@/components/ProductCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useProducts } from '@/hooks/useProducts';
import { useLang } from '@/hooks/useLang';
import { getStoredUser, storeUser, persistStoreId } from '@/utils/auth';
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

export function CustomerArea() {
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
  const [promoSeen, setPromoSeen] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

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

  useEffect(() => {
    if (sessionStorage.getItem(PROMO_MODAL_SHOWN_KEY)) return;
    const params = effectiveStoreId ? { store_id: effectiveStoreId } : {};
    api.get('/area-cliente/promo', { params })
      .then(({ data }) => {
        if (data.show && data.products?.length > 0) {
          setPromoData(data);
        }
      })
      .catch(() => {});
  }, [user?.storeId]);

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

  const ownedProducts = products.filter((p) => p.owned);
  const availableProducts = products.filter((p) => !p.owned);

  const productCountLabel = (() => {
    const total = products.length;
    const owned = ownedProducts.length;
    const totalLabel = total === 1 ? t.productsItem : t.productsItemPlural;
    const ownedLabel = owned === 1 ? t.productsAcquired : t.productsAcquiredPlural;
    return `${owned} ${t.productsOf} ${total} ${totalLabel} ${ownedLabel}`;
  })();

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Gamepad2 className="h-6 w-6 text-amber-500" />
            {t.myProductsTitle}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {!loading && !error && products.length > 0
              ? productCountLabel
              : t.productsTagline}
          </p>
        </div>
        {isAutoRefreshing && (
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/35 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 animate-pulse">
            {t.updatingProducts}
          </div>
        )}
      </div>

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
        <div className="space-y-10">
          {ownedProducts.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                {t.purchasedSection}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ownedProducts.map((product) => (
                  <ProductCard
                    key={product.productid ?? product.title}
                    product={product}
                    userEmail={user?.email}
                    storeId={effectiveStoreId ?? 1}
                    lang={lang}
                    onPaymentFlowClosed={triggerPageReload}
                  />
                ))}
              </div>
            </section>
          )}

          {availableProducts.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-lime-400" />
                {t.unlockSpecial}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {availableProducts.map((product) => (
                  <ProductCard
                    key={product.productid ?? product.title}
                    product={product}
                    userEmail={user?.email}
                    storeId={effectiveStoreId ?? 1}
                    lang={lang}
                    onPaymentFlowClosed={triggerPageReload}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {promoData && (
        <PromoModal
          products={promoData.products}
          storeId={effectiveStoreId ?? null}
          lang={lang}
          onShown={() => {
            if (!promoSeen) {
              setPromoSeen(true);
              sessionStorage.setItem(PROMO_MODAL_SHOWN_KEY, '1');
            }
            const body = effectiveStoreId ? { store_id: effectiveStoreId } : {};
            api.post('/area-cliente/promo-seen', body).catch(() => {});
          }}
          onClose={() => {
            setPromoData(null);
          }}
          onPaymentComplete={() => {
            setPromoData(null);
            triggerPageReload();
          }}
          onAccepted={(url) => {
            setPromoData(null);
            sessionStorage.setItem(CUSTOMER_AREA_REFRESH_KEY, '1');
            window.location.href = url;
          }}
        />
      )}
    </AppLayout>
  );
}
