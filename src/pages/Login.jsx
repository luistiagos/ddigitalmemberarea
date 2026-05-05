import { useState, useEffect } from 'react';
import { Mail, Lock } from 'lucide-react';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { InputField } from '@/components/ui/InputField';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/hooks/useAuth';
import { isAuthenticated, persistStoreId } from '@/utils/auth';

/**
 * Página de Login.
 * Redireciona para /area-cliente se já estiver autenticado.
 */
export function Login() {
  const { login, loading, error, setError } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  // Aceita tanto ?store_id= quanto ?storeid= (compatibilidade com links antigos)
  const rawStoreId = searchParams.get('store_id') || searchParams.get('storeid');
  const storeId = rawStoreId ? Number(rawStoreId) : null;
  // Persiste o storeId da URL após o primeiro render.
  // Runs before the authenticated redirect so that if the user is already logged in
  // and arrives via a store-specific email link, the new storeId wins over the old one.
  useEffect(() => {
    if (storeId != null) persistStoreId(storeId);
  }, [storeId]);

  // Se já está autenticado, redireciona — preservando store_id na URL de destino
  // para que CustomerArea possa detectar a troca de loja.
  if (isAuthenticated()) {
    const dest = storeId != null ? `/area-cliente?store_id=${storeId}` : '/area-cliente';
    return <Navigate to={dest} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    await login(email.trim(), password, storeId);
  };

  return (
    <AuthLayout
      title="Área do Cliente"
      subtitle="Entre com suas credenciais para acessar seus produtos"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Erro global */}
        {error && (
          <Alert
            variant="error"
            message={error}
            onClose={() => setError(null)}
          />
        )}

        <InputField
          id="email"
          type="email"
          label="E-mail"
          placeholder="seu@email.com"
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          autoFocus
        />

        <InputField
          id="password"
          label="Senha"
          placeholder="••••••••"
          icon={Lock}
          showPasswordToggle
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={!email.trim() || !password}
          className="w-full py-3 text-base font-semibold mt-2"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>

        <div className="text-center">
          <Link
            to={`/esqueci-senha${email ? `?email=${encodeURIComponent(email)}` : ''}`}
            className="text-sm text-green-400 hover:text-green-300 transition-colors"
          >
            Esqueci minha senha
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}