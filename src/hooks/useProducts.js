import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { clearAuth } from '@/utils/auth';

/**
 * Hook para buscar e gerenciar os produtos do usuário logado.
 * @param {string | null} userEmail - Email do usuário logado
 * @param {number} [storeId=1] - ID da loja (padrão: 1)
 */
export function useProducts(userEmail, storeId = 1) {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchKey, setFetchKey] = useState(0); // incrementado para forçar refetch

  const refetch = useCallback(() => setFetchKey((k) => k + 1), []);

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get(
          `/list_store_catalog?email=${encodeURIComponent(userEmail)}&storeid=${storeId}`
        );

        if (!cancelled) {
          setProducts(response.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          if (err.response?.status === 401) {
            clearAuth();
            navigate('/login', { replace: true });
          } else {
            setError('Não foi possível carregar seus produtos. Tente novamente mais tarde.');
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, [userEmail, storeId, navigate, fetchKey]);

  return { products, loading, error, refetch };
}
