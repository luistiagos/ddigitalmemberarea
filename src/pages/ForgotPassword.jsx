import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { InputField } from '@/components/ui/InputField';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import api from '@/services/api';
import { getPersistedStoreId } from '@/utils/auth';

export function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const storeId = getPersistedStoreId();
      const body = { email: email.trim().toLowerCase() };
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

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle="Informe seu e-mail e enviaremos um link para redefinir sua senha"
    >
      {sent ? (
        <div className="space-y-5">
          <Alert
            variant="success"
            message="Se este e-mail estiver cadastrado, você receberá as instruções em instantes. Verifique sua caixa de spam."
          />
          <Link
            to="/login"
            className="block text-center text-sm text-green-400 hover:text-green-300 transition-colors"
          >
            ← Voltar para o login
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
            label="E-mail"
            placeholder="seu@email.com"
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
            {loading ? 'Enviando...' : 'Enviar link de recuperação'}
          </Button>

          <Link
            to="/login"
            className="block text-center text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            ← Voltar para o login
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
