import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, Gamepad2, Sparkles } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProductCard } from '@/components/ProductCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useProducts } from '@/hooks/useProducts';
import { getStoredUser, storeUser, persistStoreId } from '@/utils/auth';
import api from '@/services/api';
import PromoModal from '@/components/PromoModal';

const CUSTOMER_AREA_REFRESH_KEY = 'customerAreaNeedsRefresh';
const PROMO_MODAL_SHOWN_KEY = 'promoModalShownThisSession';

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center animate-fade-in">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-800 border border-gray-700 mb-5">
        <Package className="h-10 w-10 text-gray-600" />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Nenhum produto disponível</h2>
      <p className="text-gray-400 text-sm max-w-sm">
        Esta loja ainda não possui produtos ativos.
      </p>
    </div>
  );
}

export function CustomerArea() {
  const [searchParams] = useSearchParams();
  const rawStoreId = searchParams.get('store_id') || searchParams.get('storeid');
  const urlStoreId = rawStoreId ? Number(rawStoreId) : null;

  // Persist store_id from URL immediately — this is the fix for cross-store leakage.
  // The email access link carries ?store_id=XXXXXX; without this, CustomerArea would
  // fall back to whatever storeId was last written to localStorage (the previous store).
  useEffect(() => {
    if (urlStoreId != null) persistStoreId(urlStoreId);
  }, [urlStoreId]);

  const user = getStoredUser();
  // URL store_id takes precedence over whatever is in localStorage
  const effectiveStoreId = urlStoreId ?? user?.storeId ?? null;
  const { products, loading, error, refetch } = useProducts(user?.email, effectiveStoreId);

  const [promoData, setPromoData] = useState(null); // { products: [...] }
  const [promoSeen, setPromoSeen] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);

  // Refresh JWT only when token has no store_id (old tokens issued before first purchase).
  // Cross-store access is handled upstream by ProtectedRoute (logout + redirect to login).
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

  // Registra o acesso à área do cliente
  useEffect(() => {
    const body = effectiveStoreId ? { store_id: effectiveStoreId } : {};
    api.post('/area-cliente/access', body).catch(() => {/* silencioso — não bloqueia a UI */});
  }, [effectiveStoreId]);

  // Verifica se o modal promocional deve ser exibido.
  // Sai imediatamente se já foi exibido nesta sessão (persiste em reloads do mesmo tab).
  useEffect(() => {
    if (sessionStorage.getItem(PROMO_MODAL_SHOWN_KEY)) return;
    const params = effectiveStoreId ? { store_id: effectiveStoreId } : {};
    api.get('/area-cliente/promo', { params })
      .then(({ data }) => {
        if (data.show && data.products?.length > 0) {
          setPromoData(data);
        }
      })
      .catch(() => {/* silencioso */});
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

  return (
    <AppLayout>
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Gamepad2 className="h-6 w-6 text-amber-500" />
            Meus Produtos
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {!loading && !error && products.length > 0
              ? `${ownedProducts.length} de ${products.length} produto${products.length !== 1 ? 's' : ''} adquirido${ownedProducts.length !== 1 ? 's' : ''}`
              : 'Jogos e produtos digitais da sua conta'}
          </p>
        </div>
        {isAutoRefreshing && (
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/35 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 animate-pulse">
            Atualizando seus produtos...
          </div>
        )}
      </div>

      {loading && <LoadingSpinner message="Carregando produtos..." />}

      {error && !loading && (
        <div className="max-w-lg space-y-3">
          <Alert variant="error" message={error} />
          <Button variant="ghost" onClick={refetch} className="text-sm">
            Tentar novamente
          </Button>
        </div>
      )}

      {!loading && !error && products.length === 0 && <EmptyState />}

      {!loading && !error && products.length > 0 && (
        <div className="space-y-10">
          {/* Seção: produtos adquiridos */}
          {ownedProducts.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                Adquiridos
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ownedProducts.map((product) => (
                  <ProductCard
                    key={product.productid ?? product.title}
                    product={product}
                    userEmail={user?.email}
                    storeId={effectiveStoreId ?? 1}
                    onPaymentFlowClosed={triggerPageReload}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Seção: produtos disponíveis para compra */}
          {availableProducts.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-lime-400" />
                Desbloqueie por uma oferta especial
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {availableProducts.map((product) => (
                  <ProductCard
                    key={product.productid ?? product.title}
                    product={product}
                    userEmail={user?.email}
                    storeId={effectiveStoreId ?? 1}
                    onPaymentFlowClosed={triggerPageReload}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Modal promocional */}
      {promoData && (
        <PromoModal
          products={promoData.products}
          storeId={effectiveStoreId ?? null}
          onShown={() => {
            // Só grava no sessionStorage e no servidor quando o modal
            // está de fato renderizado na tela. Isso evita o falso-positivo
            // onde o reload do refresh de JWT disparava antes do render.
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
