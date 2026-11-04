import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Gamepad2, Search, X, ArrowLeft, LogOut, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { clearAuth, buildLoginRedirect } from '@/utils/auth';
import { logApiError } from '@/utils/logError';
import { getUserEntitledSystems, filterPlatformsByEntitlements, filterHubPlatforms } from '@/services/accessService';
import { ALL_PLATFORMS } from './data/platformsData';
import './acesso.css';

export function AcessoHub() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userSystems, setUserSystems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('all');

  const fetchEntitlements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserEntitledSystems();
      if (data && data.success) {
        setUserSystems(data.systems || []);
      } else {
        setError('Não foi possível carregar seus direitos de acesso.');
      }
    } catch (err) {
      console.error('Erro ao consultar direitos:', err);
      if (err?.response?.status === 401) {
        clearAuth();
        navigate(buildLoginRedirect(location), { replace: true });
        return;
      }
      const userMsg = 'Falha de conexão ao carregar sistemas liberados.';
      setError(userMsg);
      logApiError('AcessoHub.jsx', 'fetchEntitlements', err, userMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntitlements();
  }, []);

  // Plataformas liberadas do usuário
  const entitledPlatforms = useMemo(() => {
    return filterPlatformsByEntitlements(ALL_PLATFORMS, userSystems);
  }, [userSystems]);

  // Lista de empresas únicas disponíveis para filtro
  const companyOptions = useMemo(() => {
    const companies = new Set();
    entitledPlatforms.forEach((p) => {
      if (p.company) companies.add(p.company);
    });
    return ['all', ...Array.from(companies)];
  }, [entitledPlatforms]);

  // Filtragem local por busca e empresa
  const filteredPlatforms = useMemo(() => {
    return filterHubPlatforms(entitledPlatforms, searchQuery, selectedCompany);
  }, [entitledPlatforms, searchQuery, selectedCompany]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col font-sans">
      {/* Header Fixo de Navegação */}
      <header className="sticky top-0 z-30 bg-gray-950/85 backdrop-blur-md border-b border-gray-800/80">
        <div className="access-container flex items-center justify-between py-3.5 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-gray-950 shadow-lg shadow-emerald-500/20">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">
                Área de Downloads <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ml-1.5">Membros</span>
              </h1>
              <p className="text-xs text-gray-400">
                {entitledPlatforms.length} {entitledPlatforms.length === 1 ? 'sistema liberado' : 'sistemas liberados'} na sua conta
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {user?.email && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900 border border-gray-800 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-gray-300 font-medium truncate max-w-[180px]">{user.email}</span>
              </div>
            )}
            <Link
              to="/area-cliente"
              style={{ color: '#ffffff' }}
              className="btn-nav-header"
            >
              <ArrowLeft className="w-3.5 h-3.5" style={{ color: '#ffffff', stroke: '#ffffff' }} />
              <span style={{ color: '#ffffff' }}>Área do Cliente</span>
            </Link>
            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/30 hover:border-red-500/60 bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-400 transition-colors"
              title="Sair da Conta"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 access-container py-8">
        {/* Loading Skeleton */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-4" />
            <h2 className="text-lg font-bold text-white mb-1">Carregando seus sistemas liberados...</h2>
            <p className="text-xs text-gray-400">Verificando direitos canônicos da sua conta.</p>
          </div>
        )}

        {/* Erro de Direitos */}
        {error && !loading && (
          <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-red-950/40 border border-red-500/30 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-2">{error}</h3>
            <p className="text-xs text-gray-400 mb-5">
              Verifique sua conexão ou tente recarregar suas permissões.
            </p>
            <button
              onClick={fetchEntitlements}
              className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-gray-950 font-bold text-xs transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Sem Sistemas Liberados */}
        {!loading && !error && entitledPlatforms.length === 0 && (
          <div className="max-w-lg mx-auto my-16 p-8 rounded-2xl bg-gray-900/60 border border-gray-800 text-center">
            <Gamepad2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Nenhum Sistema Liberado</h2>
            <p className="text-sm text-gray-400 mb-6">
              Sua conta ainda não possui sistemas ativados para download direto de ROMs.
              Acesse a Área do Cliente para consultar seus pacotes ou fale com o suporte.
            </p>
            <Link
              to="/area-cliente"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ver Meus Produtos na Área do Cliente</span>
            </Link>
          </div>
        )}

        {/* Barra de Filtros e Busca do Hub */}
        {!loading && !error && entitledPlatforms.length > 0 && (
          <>
            <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 sm:p-5 shadow-xl mb-6">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar plataforma ou console por nome (PlayStation, PS2, Sega, Arcade, Amiga...)..."
                    className="w-full h-11 pl-11 pr-10 rounded-xl bg-gray-950/80 border border-gray-800 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                      title="Limpar busca"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Chips de Categorias/Empresas */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-gray-800/60">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mr-1">
                    Fabricante:
                  </span>
                  {companyOptions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedCompany(c)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        selectedCompany === c
                          ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20'
                          : 'bg-gray-950/60 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                      }`}
                    >
                      {c === 'all' ? 'Todos' : c}
                    </button>
                  ))}
                </div>

                <div className="text-xs font-semibold text-gray-400 shrink-0">
                  Exibindo <span className="text-white font-bold">{filteredPlatforms.length}</span> de {entitledPlatforms.length} sistemas
                </div>
              </div>
            </div>

            {/* Grid de Sistemas */}
            {filteredPlatforms.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <p className="text-base font-semibold text-white mb-1">Nenhum sistema encontrado</p>
                <p className="text-xs">Tente ajustar o termo da busca ou o filtro de fabricante.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCompany('all');
                  }}
                  className="mt-4 px-4 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  Limpar Filtros
                </button>
              </div>
            ) : (
              <div className="hub-grid">
                {filteredPlatforms.map((p) => {
                  const cardAccent = p.accent || '#3b82f6';
                  const approx = p.approxCount || (p.romCount ? `${p.romCount.toLocaleString('pt-BR')} Jogos` : 'Acervo Completo');

                  return (
                    <Link
                      key={p.id}
                      to={`/acesso/${p.id}`}
                      state={{ fromHub: true }}
                      className="hub-card"
                      style={{
                        '--card-accent': cardAccent,
                        '--card-glow': `${cardAccent}44`,
                      }}
                    >
                      <div className="hub-card-header">
                        <div className="hub-card-icon">
                          <Gamepad2 className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="hub-card-badge">{approx}</span>
                          <span className="hub-card-badge uppercase text-[9px] text-amber-400 border-amber-400/20">
                            {p.shortName || p.id}
                          </span>
                        </div>
                      </div>

                      <div className="hub-card-title">{p.name}</div>
                      <div className="hub-card-company">{p.company}</div>
                      <div className="hub-card-desc">{p.tagline}</div>

                      <div className="hub-card-footer">
                        <span>Acessar Jogos &amp; Baixar</span>
                        <span>→</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
