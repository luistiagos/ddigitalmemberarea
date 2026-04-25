import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { InputField } from '@/components/ui/InputField';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import api from '@/services/api';
import { persistStoreId, isAuthenticated } from '@/utils/auth';
import { calcStrength, STRENGTH_LABELS, STRENGTH_COLORS } from '@/utils/password';
import { logError } from '@/utils/logError';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const storeIdParam = searchParams.get('store_id') || searchParams.get('storeid');
  // Persiste o store_id do link após o primeiro render
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

  if (!token) {
    return (
      <AuthLayout title="Link inválido" subtitle="Este link de redefinição é inválido ou expirou.">
        <Link
          to="/esqueci-senha"
          className="block text-center text-sm text-green-400 hover:text-green-300 transition-colors"
        >
          Solicitar novo link
        </Link>
      </AuthLayout>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/reset-password', { token, password });
      if (response.data.success) {
        setSuccess(true);
        // Redireciona para login com email pré-preenchido (sem autenticar — sessão ainda não existe)
        const email = response.data.email || '';
        const storeParam = storeIdParam ? `&store_id=${storeIdParam}` : '';
        setTimeout(() => navigate(`/login${email ? `?email=${encodeURIComponent(email)}${storeParam}` : ''}`), 2000);
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Erro ao redefinir senha. Tente novamente.';
      setError(message);
      logError('ResetPassword.jsx', 'handleSubmit', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Nova senha"
      subtitle="Crie uma nova senha para sua conta"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {success ? (
          <Alert variant="success" message="Senha redefinida! Redirecionando para o login..." />
        ) : (
          <>
            {error && (
              <Alert variant="error" message={error} onClose={() => setError(null)} />
            )}

            <div>
              <InputField
                id="password"
                label="Nova senha"
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
                    Força: <span className="font-medium">{STRENGTH_LABELS[strength]}</span>
                  </p>
                </div>
              )}
            </div>

            <InputField
              id="confirm"
              label="Confirmar senha"
              placeholder="••••••••"
              icon={Lock}
              showPasswordToggle
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              error={passwordMismatch ? 'As senhas não coincidem.' : undefined}
            />

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              disabled={!password || !passwordMatch}
              className="w-full py-3 text-base font-semibold"
            >
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </Button>
          </>
        )}
      </form>
    </AuthLayout>
  );
}
