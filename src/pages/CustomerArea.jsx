import { useEffect, useState } from 'react';
import { Package, Gamepad2, Sparkles } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProductCard } from '@/components/ProductCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useProducts } from '@/hooks/useProducts';
import { getStoredUser } from '@/utils/auth';
import api from '@/services/api';
import PromoModal from '@/components/PromoModal';

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
  const user = getStoredUser();
  const { products, loading, error, refetch } = useProducts(user?.email, user?.storeId ?? null);

  const [promoData, setPromoData] = useState(null); // { products: [...] }
  const [promoSeen, setPromoSeen] = useState(false);

  // Registra o acesso à área do cliente
  useEffect(() => {
    const body = user?.storeId ? { store_id: user.storeId } : {};
    api.post('/area-cliente/access', body).catch(() => {/* silencioso — não bloqueia a UI */});
  }, []);

  // Verifica se o modal promocional deve ser exibido
  useEffect(() => {
    const params = user?.storeId ? { store_id: user.storeId } : {};
    api.get('/area-cliente/promo', { params })
      .then(({ data }) => {
        if (data.show && data.products?.length > 0) {
          setPromoData(data);
        }
      })
      .catch(() => {/* silencioso */});
  }, []);

  // Registra a exibição do modal ao apresentar pela primeira vez
  useEffect(() => {
    if (promoData && !promoSeen) {
      setPromoSeen(true);
      api.post('/area-cliente/promo-seen').catch(() => {});
    }
  }, [promoData, promoSeen]);

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
                  <ProductCard key={product.productid ?? product.title} product={product} userEmail={user?.email} storeId={user?.storeId ?? 1} />
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
                  <ProductCard key={product.productid ?? product.title} product={product} userEmail={user?.email} storeId={user?.storeId ?? 1} />
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
          onClose={() => setPromoData(null)}
          onAccepted={(url) => {
            setPromoData(null);
            window.location.href = url;
          }}
        />
      )}
    </AppLayout>
  );
}
