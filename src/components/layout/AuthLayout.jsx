import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '@/services/api';
import { getPersistedStoreId } from '@/utils/auth';

/**
 * Ícone gamepad FA solid com gradiente ciano→pink (igual ao site original)
 */
function LogoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 512"
      width="44"
      height="35"
      style={{ transform: 'rotate(-10deg)', filter: 'drop-shadow(0 0 10px rgba(0,242,234,0.55))' }}
    >
      <defs>
        <linearGradient id="auth-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f2ea" />
          <stop offset="100%" stopColor="#ff0055" />
        </linearGradient>
      </defs>
      <path
        fill="url(#auth-logo-gradient)"
        d="M192 64C86 64 0 150 0 256S86 448 192 448l256 0c106 0 192-86 192-192s-86-192-192-192L192 64zM496 168a40 40 0 1 1 0 80 40 40 0 1 1 0-80zM392 304a40 40 0 1 1 80 0 40 40 0 1 1 -80 0zM168 200c0-13.3 10.7-24 24-24s24 10.7 24 24l0 32 32 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-32 0 0 32c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-32-32 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l32 0 0-32z"
      />
    </svg>
  );
}

/**
 * Layout compartilhado das páginas de autenticação (Login, SetPassword).
 * Exibe o logo, título e subtítulo sobre um card estilizado.
 */
export function AuthLayout({ title, subtitle, children }) {
  const [searchParams] = useSearchParams();
  const [storeName, setStoreName] = useState(() => {
    const rawStoreId = searchParams.get('store_id') || searchParams.get('storeid');
    const storeId = rawStoreId ? Number(rawStoreId) : getPersistedStoreId();
    if (storeId) {
      const cached = localStorage.getItem(`storeLogoLabel_${storeId}`);
      if (cached) return cached;
    }
    return 'Digital Store Games';
  });

  useEffect(() => {
    const rawStoreId = searchParams.get('store_id') || searchParams.get('storeid');
    const storeId = rawStoreId ? Number(rawStoreId) : getPersistedStoreId();
    
    if (storeId) {
      const cached = localStorage.getItem(`storeLogoLabel_${storeId}`);
      if (cached) {
        setStoreName(cached);
        return;
      }
      
      api.get(`/store/${storeId}/checkout_info`)
        .then(({ data }) => {
          if (data && data.store && data.store.checkout_logo_label) {
            const label = data.store.checkout_logo_label.trim() || 'Digital Store Games';
            setStoreName(label);
            localStorage.setItem(`storeLogoLabel_${storeId}`, label);
          }
        })
        .catch(err => {
          console.error("AuthLayout: failed to fetch store info", err);
        });
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      {/* Gradiente de fundo decorativo */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* Card central */}
      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo + cabeçalho */}
        <div className="text-center mb-8">
          {/* Logo: ícone + texto lado a lado (igual ao site original) */}
          <div className="inline-flex items-center gap-3 mb-5">
            <LogoIcon />
            {storeName === 'Digital Store Games' ? (
              <div style={{ fontFamily: "'Rajdhani', sans-serif", lineHeight: 0.85, textAlign: 'left' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '1px', color: '#fff', textTransform: 'uppercase' }}>
                  Digital Store
                </div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  background: 'linear-gradient(90deg, #fff, #a0a0b0)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  Games
                </div>
              </div>
            ) : (
              <div style={{ fontFamily: "'Rajdhani', sans-serif", lineHeight: 1.1, textAlign: 'left' }}>
                <div style={{
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  background: 'linear-gradient(90deg, #fff, #a0a0b0)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  {storeName}
                </div>
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-sm text-gray-400">{subtitle}</p>
          )}
        </div>

        {/* Card de formulário */}
        <div className="bg-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 shadow-2xl">
          {children}
        </div>

        {/* Rodapé */}
        <p className="mt-6 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} {storeName} · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}

