import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { InputField } from '@/components/ui/InputField';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useLang } from '@/hooks/useLang';
import api from '@/services/api';
import { getPersistedStoreId, isAuthenticated } from '@/utils/auth';

export function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const { lang, t } = useLang();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  if (isAuthenticated()) {
    return <Navigate to="/area-cliente" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const storeId = getPersistedStoreId();
      const body = { email: email.trim().toLowerCase(), lang };
      if (storeId != null) body.store_id = storeId;
      await api.post('/auth/forgot-password', body);
      setSent(true);
    } catch (err) {
      const message = err.response?.data?.error || 'Erro ao enviar email. Tente novamente.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const loginHref = lang !== 'ptbr' ? `/login?lang=${lang}` : '/login';

  return (
    <AuthLayout title={t.recoverTitle} subtitle={t.recoverSubtitle}>
      {sent ? (
        <div className="space-y-5">
          <Alert variant="success" message={t.recoverSuccessMsg} />
          <Link
            to={loginHref}
            className="block text-center text-sm text-green-400 hover:text-green-300 transition-colors"
          >
            {t.backToLogin}
          </Link>
        </div>
      ) : (
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

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={!email.trim()}
            className="w-full py-3 text-base font-semibold"
          >
            {loading ? t.sendingLink : t.sendRecoveryLink}
          </Button>

          <Link
            to={loginHref}
            className="block text-center text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            {t.backToLogin}
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
