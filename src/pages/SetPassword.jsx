import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { InputField } from '@/components/ui/InputField';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import api from '@/services/api';
import { storeUser, persistStoreId } from '@/utils/auth';
import { calcStrength, STRENGTH_LABELS, STRENGTH_COLORS } from '@/utils/password';
import { logError } from '@/utils/logError';

/**
 * Página de criação/redefinição de senha.
 * Acessada via query string ?email=xxx@yyy.com
 */
export function SetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || '';
  // Aceita tanto ?store_id= quanto ?storeid= (compatibilidade com links antigos)
  const rawStoreId = searchParams.get('store_id') || searchParams.get('storeid');
  const storeId = rawStoreId ? Number(rawStoreId) : null;
  // Persiste o storeId da URL após o primeiro render
  useEffect(() => {
    if (storeId != null) persistStoreId(storeId);
  }, [storeId]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const strength = calcStrength(password);
  const strengthWidth = `${(strength / 4) * 100}%`;

  const passwordMatch = password && confirm && password === confirm;
  const passwordMismatch = confirm && password !== confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setError('E-mail inválido. Volte à tela de login.');
      return;
    }
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
      const body = { email, password };
      if (storeId != null) body.store_id = storeId;
      const response = await api.post('/auth/set-password', body);
      if (response.data.success) {
        const userData = response.data.user ?? { email, id: '' };
        // Garante que o storeId da URL seja salvo mesmo que o backend
        // não o devolva (ex.: fallback sem token após login interno falhar)
        if (storeId != null && userData.storeId == null) {
          userData.storeId = storeId;
        }
        storeUser(userData, response.data.token ?? null);
        setSuccess(true);
        setTimeout(() => navigate('/area-cliente'), 1500);
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Erro ao definir senha. Tente novamente.';
      setError(message);
      logError('SetPassword.jsx', 'handleSubmit', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Crie sua senha"
      subtitle={
        email
          ? `Definindo senha para ${email}`
          : 'Por favor, crie uma senha para acessar sua conta'
      }
    >
      {/* E-mail (readonly, informativo) */}
      <div className="mb-5">
        <InputField
          id="email-display"
          type="email"
          label="E-mail"
          icon={Mail}
          value={email}
          readOnly
          className="cursor-not-allowed opacity-60"
        />
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {success ? (
          <Alert variant="success" message="Senha criada! Redirecionando..." />
        ) : (
          <>
            {error && (
              <Alert variant="error" message={error} onClose={() => setError(null)} />
            )}

            {/* Senha */}
            <div className="space-y-2">
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
            autoComplete="new-password"
          />

          {/* Barra de força */}
          {password && (
            <div className="space-y-1 animate-fade-in-fast">
              <div className="h-1 w-full rounded-full bg-gray-700">
                <div
                  className={`strength-bar ${STRENGTH_COLORS[strength]}`}
                  style={{ width: strengthWidth }}
                />
              </div>
              <p className={`text-xs ${strength >= 3 ? 'text-green-400' : 'text-gray-500'}`}>
                Força: {STRENGTH_LABELS[strength]}
              </p>
            </div>
          )}
        </div>

        {/* Confirmar senha */}
        <InputField
          id="confirm"
          label="Confirmar senha"
          placeholder="••••••••"
          icon={Lock}
          showPasswordToggle
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          error={passwordMismatch ? 'As senhas não coincidem' : undefined}
        />

        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={!password || !passwordMatch || loading}
          className="w-full py-3 text-base font-semibold mt-2"
        >
          {loading ? 'Salvando...' : 'Salvar senha e entrar'}
        </Button>
          </>
        )}
      </form>
    </AuthLayout>
  );
}