import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { InputField } from '@/components/ui/InputField';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useLang } from '@/hooks/useLang';
import api from '@/services/api';
import { persistStoreId, isAuthenticated } from '@/utils/auth';
import { calcStrength, STRENGTH_COLORS } from '@/utils/password';
import { logError } from '@/utils/logError';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang, t } = useLang();
  const token = searchParams.get('token') || '';
  const storeIdParam = searchParams.get('store_id') || searchParams.get('storeid');

  useEffect(() => {
    if (storeIdParam) persistStoreId(Number(storeIdParam));
  }, [storeIdParam]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (isAuthenticated()) {
    return <Navigate to="/area-cliente" replace />;
  }

  const strength = calcStrength(password);
  const strengthWidth = `${(strength / 4) * 100}%`;
  const passwordMatch = password && confirm && password === confirm;
  const passwordMismatch = confirm && password !== confirm;

  const forgotHref = lang !== 'ptbr' ? `/esqueci-senha?lang=${lang}` : '/esqueci-senha';

  if (!token) {
    return (
      <AuthLayout title={t.invalidLinkTitle} subtitle={t.invalidLinkSubtitle}>
        <Link
          to={forgotHref}
          className="block text-center text-sm text-green-400 hover:text-green-300 transition-colors"
        >
          {t.requestNewLink}
        </Link>
      </AuthLayout>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError(t.passwordMinError);
      return;
    }
    if (password !== confirm) {
      setError(t.passwordMismatchError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/reset-password', { token, password });
      if (response.data.success) {
        setSuccess(true);
        const email = response.data.email || '';
        const storeParam = storeIdParam ? `&store_id=${storeIdParam}` : '';
        const langParam = lang !== 'ptbr' ? `&lang=${lang}` : '';
        setTimeout(() => navigate(`/login${email ? `?email=${encodeURIComponent(email)}${storeParam}${langParam}` : ''}`), 2000);
      }
    } catch (err) {
      const userMessage = err.response?.data?.error || 'Erro ao redefinir senha. Tente novamente.';
      setError(userMessage);
      const httpStatus = err.response?.status ?? 'no_response';
      const originalMsg = err.message || String(err);
      logError('ResetPassword.jsx', 'handleSubmit', `[HTTP ${httpStatus}] ${originalMsg} | user_msg: ${userMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t.newPasswordTitle} subtitle={t.newPasswordSubtitle}>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {success ? (
          <Alert variant="success" message={t.passwordReset} />
        ) : (
          <>
            {error && (
              <Alert variant="error" message={error} onClose={() => setError(null)} />
            )}

            <div>
              <InputField
                id="password"
                label={t.newPasswordLabel}
                placeholder="••••••••"
                icon={Lock}
                showPasswordToggle
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-gray-700">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${STRENGTH_COLORS[strength]}`}
                      style={{ width: strengthWidth }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    {t.passwordStrength} <span className="font-medium">{t.strengthLabels[strength]}</span>
                  </p>
                </div>
              )}
            </div>

            <InputField
              id="confirm"
              label={t.confirmPasswordLabel}
              placeholder="••••••••"
              icon={Lock}
              showPasswordToggle
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              error={passwordMismatch ? t.passwordMismatchError : undefined}
            />

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={!password || !passwordMatch}
              className="w-full py-3 text-base font-semibold"
            >
              {loading ? t.saving : t.saveNewPassword}
            </Button>
          </>
        )}
      </form>
    </AuthLayout>
  );
}
