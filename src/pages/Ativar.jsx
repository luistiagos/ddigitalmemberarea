import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound, Tv } from 'lucide-react';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { InputField } from '@/components/ui/InputField';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useLang } from '@/hooks/useLang';
import api from '@/services/api';
import { isAuthenticated, getStoredUser, clearAuth } from '@/utils/auth';
import { guardarAtivacaoPendente, limparAtivacaoPendente } from '@/utils/ativacao';
import { logApiError } from '@/utils/logError';

/**
 * Página /ativar — o cliente aprova, logado na área do cliente, o código que o
 * app mostra no QR (`/ativar?code=ABCD-EFGH`) ou digitado aqui.
 *
 * Contrato das rotas: `mysite/appapi.py` (backend), `info` e `approve`.
 * Sem login, o código fica pendente (`utils/ativacao.js`) e o `ProtectedRoute`
 * traz o cliente de volta depois do login, do "Primeiro acesso" ou do reset.
 * Nada é aprovado sem o clique em "Ativar"; repetir o `approve` pela mesma
 * conta responde 200, então "tentar de novo" depois de erro de rede é seguro.
 *
 * Doc: docs/modules/area-membros/changes/2026-10-13-direito-de-acesso-por-conta/design.md (T8)
 */

/** Erro da API -> o que a página mostra. 401 é tratado à parte (volta ao login). */
function tipoDoErro(err) {
  const status = err?.response?.status;
  if (status === 400 || status === 404) return 'codigo';
  if (status === 410) return 'expirado';
  if (status === 429) return 'limite';
  return 'rede';
}

function nomeDoDispositivo(dispositivo) {
  return dispositivo?.device_nome || dispositivo?.app || '';
}

function Conteudos({ conteudos, t }) {
  const { estado, systems = [], slices = [], em_preparacao: emPreparacao = [] } = conteudos || {};
  const chips = (itens) => (
    <div className="flex flex-wrap gap-2">
      {itens.map((item) => (
        <span key={item} className="rounded-md bg-gray-700/70 px-2 py-1 text-xs font-semibold text-gray-100">
          {String(item).toUpperCase()}
        </span>
      ))}
    </div>
  );

  return (
    <div className="space-y-3 rounded-xl border border-gray-700/60 bg-gray-900/40 p-4 text-sm">
      {estado === 'em_configuracao' ? (
        <p className="text-gray-300">{t.ativarEmConfiguracao}</p>
      ) : systems.length || slices.length ? (
        <>
          <p className="text-gray-300">{t.ativarConteudosTitulo}</p>
          {systems.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-gray-500">{t.ativarSistemas}</p>
              {chips(systems)}
            </div>
          )}
          {slices.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-gray-500">{t.ativarExtras}</p>
              {chips(slices)}
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-300">{t.ativarSemConteudo}</p>
      )}
      {emPreparacao.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-gray-500">{t.ativarEmPreparacao}</p>
          <ul className="list-disc pl-5 text-gray-400">
            {emPreparacao.map((p) => <li key={p.id}>{p.titulo}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Ativar() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLang();
  const code = (searchParams.get('code') || '').trim();
  const logado = isAuthenticated();

  // 'carregando' | 'confirmar' | 'aprovando' | 'pronto' | 'erro'
  const [fase, setFase] = useState('carregando');
  const [info, setInfo] = useState(null);
  const [erro, setErro] = useState(null); // 'codigo' | 'expirado' | 'limite' | 'rede'
  const [tentativa, setTentativa] = useState(0);
  const [digitado, setDigitado] = useState('');

  // Sem login (ou sessão vencida no servidor): guarda o código e pede o login.
  const pedirLogin = () => {
    if (getStoredUser()) clearAuth();
    guardarAtivacaoPendente(code);
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    if (!code) return;
    if (!logado) {
      pedirLogin();
      return;
    }
    limparAtivacaoPendente();
    let ativo = true;
    setFase('carregando');
    setErro(null);
    (async () => {
      try {
        const { data } = await api.get('/api/app/device/info', { params: { code } });
        if (!ativo) return;
        setInfo(data);
        setFase(data?.status === 'aprovado' ? 'pronto' : 'confirmar');
      } catch (err) {
        if (!ativo) return;
        if (err.response?.status === 401) {
          pedirLogin();
          return;
        }
        setErro(tipoDoErro(err));
        setFase('erro');
        logApiError('Ativar.jsx', 'info', err, 'info');
      }
    })();
    return () => { ativo = false; };
    // pedirLogin só usa code e navigate, que já estão nas dependências.
  }, [code, logado, tentativa, navigate]);

  const aprovar = async () => {
    setFase('aprovando');
    setErro(null);
    try {
      await api.post('/api/app/device/approve', { code });
      setFase('pronto');
    } catch (err) {
      if (err.response?.status === 401) {
        pedirLogin();
        return;
      }
      const tipo = tipoDoErro(err);
      setErro(tipo);
      // Erro de rede: continua na confirmação, com o botão para tentar de novo.
      setFase(tipo === 'rede' ? 'confirmar' : 'erro');
      logApiError('Ativar.jsx', 'approve', err, 'approve');
    }
  };

  const digitar = (e) => {
    e.preventDefault();
    const limpo = digitado.replace(/\s+/g, '').toUpperCase();
    if (!limpo) return;
    navigate(`/ativar?code=${encodeURIComponent(limpo)}`);
  };

  const mensagemDeErro = {
    codigo: t.ativarErroCodigo,
    expirado: t.ativarErroExpirado,
    limite: t.ativarErroLimite,
    rede: t.connectionError,
  }[erro];

  const formularioDoCodigo = (
    <form onSubmit={digitar} noValidate className="space-y-5">
      <InputField
        id="codigo"
        label={t.ativarCodigoLabel}
        placeholder="ABCD-EFGH"
        icon={KeyRound}
        value={digitado}
        onChange={(e) => setDigitado(e.target.value)}
        autoComplete="off"
        autoCapitalize="characters"
        autoFocus
      />
      <Button type="submit" variant="primary" disabled={!digitado.trim()} className="w-full py-3 text-base font-semibold">
        {t.ativarContinuar}
      </Button>
    </form>
  );

  const linkDaArea = (
    <Link to="/area-cliente" className="block text-center text-sm text-gray-400 hover:text-gray-300 transition-colors">
      {t.ativarIrParaArea}
    </Link>
  );

  // Sem código na URL: o cliente digita o código que o app mostra.
  if (!code) {
    return (
      <AuthLayout title={t.ativarDigiteTitulo} subtitle={t.ativarDigiteSubtitulo}>
        {formularioDoCodigo}
      </AuthLayout>
    );
  }

  if (!logado || fase === 'carregando') {
    return (
      <AuthLayout title={t.ativarCarregando}>
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-green-400" />
        </div>
      </AuthLayout>
    );
  }

  if (fase === 'erro') {
    return (
      <AuthLayout title={t.ativarErroTitulo}>
        <div className="space-y-5">
          <Alert variant="error" message={mensagemDeErro} />
          {erro === 'codigo' && formularioDoCodigo}
          {erro === 'rede' && (
            <Button variant="primary" onClick={() => setTentativa((n) => n + 1)} className="w-full py-3 text-base font-semibold">
              {t.ativarTentarDeNovo}
            </Button>
          )}
          {linkDaArea}
        </div>
      </AuthLayout>
    );
  }

  const nome = nomeDoDispositivo(info?.dispositivo);

  if (fase === 'pronto') {
    return (
      <AuthLayout title={t.ativarProntoTitulo}>
        <div className="space-y-5">
          <Alert variant="success" message={t.ativarProntoMsg.replace('{dispositivo}', nome)} />
          {linkDaArea}
        </div>
      </AuthLayout>
    );
  }

  // 'confirmar' | 'aprovando'
  return (
    <AuthLayout title={t.ativarTitulo.replace('{dispositivo}', nome)} subtitle={t.ativarSubtitulo}>
      <div className="space-y-5">
        {erro && <Alert variant="error" message={mensagemDeErro} onClose={() => setErro(null)} />}

        <div className="flex items-center gap-3 rounded-xl border border-gray-700/60 bg-gray-900/40 p-4">
          <Tv aria-hidden="true" className="h-6 w-6 shrink-0 text-green-400" />
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{nome}</p>
            <p className="text-xs text-gray-400">
              {t.ativarCodigoLabel}: <span className="font-mono tracking-wider">{info?.user_code}</span>
            </p>
          </div>
        </div>

        <Conteudos conteudos={info?.conteudos} t={t} />

        <Alert variant="warning" message={t.ativarAvisoPhishing} />

        <Button
          variant="primary"
          onClick={aprovar}
          loading={fase === 'aprovando'}
          className="w-full py-3 text-base font-semibold"
        >
          {erro === 'rede' ? t.ativarTentarDeNovo : t.ativarBotao}
        </Button>

        {linkDaArea}
      </div>
    </AuthLayout>
  );
}
