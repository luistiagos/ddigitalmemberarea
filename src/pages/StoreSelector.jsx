import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Store } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert } from '@/components/ui/Alert';
import api from '@/services/api';
import { persistStoreId } from '@/utils/auth';

export function StoreSelector() {
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/user/stores')
      .then(({ data }) => {
        if (data.length === 1) {
          // Single store — skip selector, go straight in
          persistStoreId(data[0].id);
          navigate(`/area-cliente?store_id=${data[0].id}`, { replace: true });
          return;
        }
        setStores(data);
      })
      .catch(() => setError('Não foi possível carregar suas lojas. Tente novamente.'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSelect = (storeId) => {
    persistStoreId(storeId);
    navigate(`/area-cliente?store_id=${storeId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <LoadingSpinner message="Carregando suas lojas..." />
      </div>
    );
  }

  return (
    <AuthLayout
      title="Selecione sua loja"
      subtitle="Você tem acesso a múltiplas lojas. Escolha qual deseja acessar."
    >
      {error && <Alert variant="error" message={error} className="mb-4" />}

      {!error && stores.length === 0 && (
        <Alert variant="error" message="Nenhuma loja encontrada para sua conta." />
      )}

      <div className="space-y-3">
        {stores.map((store) => (
          <button
            key={store.id}
            onClick={() => handleSelect(store.id)}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-700 bg-gray-800 hover:border-green-500 hover:bg-gray-750 transition-all text-left group"
          >
            {store.url_thumb ? (
              <img
                src={store.url_thumb}
                alt={store.name}
                className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
                <Store className="h-6 w-6 text-gray-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold truncate group-hover:text-green-400 transition-colors">
                {store.name}
              </p>
              <p className="text-gray-400 text-sm">Loja #{store.id}</p>
            </div>
            <Gamepad2 className="h-5 w-5 text-gray-600 group-hover:text-green-400 transition-colors flex-shrink-0" />
          </button>
        ))}
      </div>
    </AuthLayout>
  );
}
