import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { InputField } from '@/components/ui/InputField';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useLang } from '@/hooks/useLang';
import api from '@/services/api';
import { storeUser, persistStoreId, isAuthenticated } from '@/utils/auth';
import { calcStrength, STRENGTH_COLORS } from '@/utils/password';
import { logError } from '@/utils/logError';

export function SetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang, t } = useLang();
  const email = searchParams.get('email') || '';
  // Aceita tanto ?store_id= quanto ?storeid= (compatibilidade com links antigos)
  const rawStoreId = searchParams.get('store_id') || searchParams.get('storeid');
  const storeId = rawStoreId ? Number(rawStoreId) : null;

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [checkingEntry, setCheckingEntry] = useState(Boolean(email));

  useEffect(() => {
    if (storeId != null) persistStoreId(storeId);
  }, [storeId]);

  // Se a senha já foi criada, manda direto para o login.
  useEffect(() => {
    if (!email) return;
    let active = true;
    (async () => {
      try {
        const { data } = await api.get('/auth/access-entry', { params: { email } });
        if (active && data?.entry === 'login') {
          const storeParam = storeId != null ? `&store_id=${storeId}` : '';
          const langParam = lang !== 'ptbr' ? `&lang=${lang}` : '';
          navigate(`/login?email=${encodeURIComponent(email)}${storeParam}${langParam}`, { replace: true });
          return;
        }
      } catch {
        // Falha na checagem não bloqueia o form.
      }
      if (active) setCheckingEntry(false);
    })();
    return () => { active = false; };
  }, [email, storeId, lang, navigate]);

  if (isAuthenticated()) {
    return <Navigate to="/area-cliente" replace />;
  }

  if (checkingEntry) {
    return (
      <AuthLayout title={t.createPasswordTitle} subtitle={t.passwordLoading}>
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-green-400" />
        </div>
      </AuthLayout>
    );
  }

  const strength = calcStrength(password);
  const strengthWidth = `${(strength / 4) * 100}%`;

  const passwordMatch = password && confirm && password === confirm;
  const passwordMismatch = confirm && password !== confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setError(t.invalidEmailError);
      return;
    }
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
      const body = { email, password };
      if (storeId != null) body.store_id = storeId;
      const response = await api.post('/auth/set-password', body);
      if (response.data.success) {
        const userData = response.data.user ?? { email, id: '' };
        storeUser(userData, response.data.token ?? null);
        setSuccess(true);
        const langParam = lang !== 'ptbr' ? `?lang=${lang}` : '';
        setTimeout(() => navigate(`/area-cliente${langParam}`), 1500);
      }
    } catch (err) {
      if (err.response?.status === 409) {
        const storeParam = storeId != null ? `&store_id=${storeId}` : '';
        const langParam = lang !== 'ptbr' ? `&lang=${lang}` : '';
        navigate(`/login?email=${encodeURIComponent(email)}${storeParam}${langParam}`, { replace: true });
        return;
      }
      const userMessage = err.response?.data?.error || 'Erro ao definir senha. Tente novamente.';
      setError(userMessage);
      const httpStatus = err.response?.status ?? 'no_response';
      const originalMsg = err.message || String(err);
      logError('SetPassword.jsx', 'handleSubmit', `[HTTP ${httpStatus}] ${originalMsg} | user_msg: ${userMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t.createPasswordTitle}
      subtitle={
        email
          ? `${t.settingPasswordFor} ${email}`
          : t.createPasswordSubtitle
      }
    >
      <div className="mb-5">
        <InputField
          id="email-display"
          type="email"
          label={t.emailLabel}
          icon={Mail}
          value={email}
          readOnly
          className="cursor-not-allowed opacity-60"
        />
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {success ? (
          <Alert variant="success" message={t.passwordCreated} />
        ) : (
          <>
            {error && (
              <Alert variant="error" message={error} onClose={() => setError(null)} />
            )}

            <div className="space-y-2">
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
                autoComplete="new-password"
              />

              {password && (
                <div className="space-y-1 animate-fade-in-fast">
                  <div className="h-1 w-full rounded-full bg-gray-700">
                    <div
                      className={`strength-bar ${STRENGTH_COLORS[strength]}`}
                      style={{ width: strengthWidth }}
                    />
                  </div>
                  <p className={`text-xs ${strength >= 3 ? 'text-green-400' : 'text-gray-500'}`}>
                    {t.passwordStrength} {t.strengthLabels[strength]}
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
              autoComplete="new-password"
              error={passwordMismatch ? t.passwordMismatchError : undefined}
            />

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={!password || !passwordMatch || loading}
              className="w-full py-3 text-base font-semibold mt-2"
            >
              {loading ? t.saving : t.saveAndEnter}
            </Button>
          </>
        )}
      </form>
    </AuthLayout>
  );
}
