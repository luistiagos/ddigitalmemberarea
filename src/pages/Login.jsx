import { useState, useEffect } from 'react';
import { Mail, Lock } from 'lucide-react';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { InputField } from '@/components/ui/InputField';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/hooks/useAuth';
import { useLang } from '@/hooks/useLang';
import { isAuthenticated, isSameStoredAccount, clearAuth, persistStoreId } from '@/utils/auth';

export function Login() {
  const { login, loading, error, setError } = useAuth();
  const [searchParams] = useSearchParams();
  const { lang, t } = useLang();
  const urlEmail = searchParams.get('email') || '';
  const [email, setEmail] = useState(urlEmail);
  const [password, setPassword] = useState('');
  // Aceita tanto ?store_id= quanto ?storeid= (compatibilidade com links antigos)
  const rawStoreId = searchParams.get('store_id') || searchParams.get('storeid');
  const storeId = rawStoreId ? Number(rawStoreId) : null;

  // O link de acesso aponta para OUTRA conta que a sessão guardada. Antes, o
  // atalho abaixo mandava direto para /area-cliente e o `?email=` do link era
  // descartado — então o link que o suporte manda para consertar um
  // `localStorage` defasado não consertava nada, e o cliente seguia vendo
  // "0 de N produtos adquiridos" pela grafia velha. O link manda: derruba a
  // sessão e pede a senha.
  const contaDivergente = isAuthenticated() && Boolean(urlEmail) && !isSameStoredAccount(urlEmail);

  useEffect(() => {
    if (storeId != null) persistStoreId(storeId);
  }, [storeId]);

  useEffect(() => {
    if (contaDivergente) clearAuth();
  }, [contaDivergente]);

  if (isAuthenticated() && !contaDivergente) {
    const dest = storeId != null ? `/area-cliente?store_id=${storeId}` : '/area-cliente';
    return <Navigate to={dest} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    await login(email.trim(), password, storeId);
  };

  const langSuffix = lang !== 'ptbr' ? `&lang=${lang}` : '';
  const forgotHref = `/esqueci-senha${email ? `?email=${encodeURIComponent(email)}${langSuffix}` : (lang !== 'ptbr' ? `?lang=${lang}` : '')}`;

  return (
    <AuthLayout title={t.loginTitle} subtitle={t.loginSubtitle}>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {error && (
          <Alert variant="error" message={error} onClose={() => setError(null)} />
        )}

        <InputField
          id="email"
          type="email"
          label={t.emailLabel}
          placeholder={t.emailPlaceholder}
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          autoFocus
        />

        <InputField
          id="password"
          label={t.passwordLabel}
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
          {loading ? t.signingIn : t.signIn}
        </Button>

        <div className="text-center">
          <Link
            to={forgotHref}
            className="text-sm text-green-400 hover:text-green-300 transition-colors"
          >
            {t.forgotPasswordLink}
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
