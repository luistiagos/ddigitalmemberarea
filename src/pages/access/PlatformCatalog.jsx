import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { Gamepad2, ArrowLeft, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { clearAuth, buildLoginRedirect } from '@/utils/auth';
import { logApiError } from '@/utils/logError';
import { getUserEntitledSystems, getPlatformManifest, classifyEntitlementResult } from '@/services/accessService';
import { getCachedCatalog, setCachedCatalog } from '@/services/accessCache';
import { ALL_PLATFORMS } from './data/platformsData';
import { processAndGroupEntries, isGroupedCatalogCache, hydrateGroupedCatalog } from './utils/catalogProcessor';
import { GameCard } from './components/GameCard';
import { GameModal } from './components/GameModal';
import { CatalogToolbar } from './components/CatalogToolbar';
import './acesso.css';

const BATCH_SIZE = 48;

export function PlatformCatalog() {
  const { platformId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const fromHub = Boolean(location?.state?.fromHub);
  const { user } = useAuth();

  const [authLoading, setAuthLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState('loading');
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [error, setError] = useState(null);

  const [rawGames, setRawGames] = useState([]);
  const [groupedGames, setGroupedGames] = useState([]);
  const [renderedCount, setRenderedCount] = useState(BATCH_SIZE);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedGame, setSelectedGame] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const sentinelRef = useRef(null);

  // Mapeia aliases e encontra a plataforma
  const platform = useMemo(() => {
    if (!platformId) return null;
    const cleanId = platformId.toLowerCase();
    const aliasMap = { psx: 'ps1', lynx: 'camplynx', samcoupe: 'simcoupe' };
    const targetId = aliasMap[cleanId] || cleanId;

    return ALL_PLATFORMS.find(
      (p) => p.id.toLowerCase() === targetId || (p.mnemonic && p.mnemonic.toLowerCase() === targetId)
    );
  }, [platformId]);

  // Aplica tema visual dinâmico do console
  useEffect(() => {
    if (platform) {
      document.documentElement.style.setProperty('--console-primary', platform.accent || '#10b981');
      document.documentElement.style.setProperty('--console-glow', `${platform.accent || '#10b981'}44`);
      document.documentElement.style.setProperty('--console-border', `${platform.accent || '#10b981'}66`);
      document.documentElement.style.setProperty('--console-header-bg', platform.headerBg || '#0f172a');
    }
  }, [platform]);

  // Carrega Catálogo com Caching IndexedDB (armazena o resultado já agrupado para restaurar sem bloquear a UI)
  const loadCatalog = async (forceRefresh = false) => {
    if (!platform) return;
    setCatalogLoading(true);
    setError(null);

    try {
      let cached = null;
      if (!forceRefresh) {
        cached = await getCachedCatalog(platform.id);
      }

      let grouped = [];
      if (cached && cached.length > 0) {
        grouped = hydrateGroupedCatalog(cached, platform);
        if (!isGroupedCatalogCache(cached) && grouped.length > 0) {
          setCachedCatalog(platform.id, grouped);
        }
      } else {
        const entries = await getPlatformManifest(platform.mnemonic);
        setRawGames(entries || []);
        grouped = processAndGroupEntries(entries || [], platform);
        if (grouped.length > 0) {
          setCachedCatalog(platform.id, grouped);
        }
      }

      setGroupedGames(grouped);
      setRenderedCount(BATCH_SIZE);
    } catch (err) {
      console.error('Erro ao carregar catálogo da plataforma:', err);
      const userMsg = 'Falha de conexão com a base de jogos.';
      setError(userMsg);
      logApiError('PlatformCatalog.jsx', 'loadCatalog', err, userMsg);
    } finally {
      setCatalogLoading(false);
    }
  };

  // Verificação de Direitos de Acesso do Usuário para esta Plataforma
  const checkAuthorization = useCallback(async (isMountedRef = { current: true }) => {
    setAuthLoading(true);
    setError(null);

    if (!platform) {
      if (isMountedRef.current) {
        setAuthStatus('denied');
        setAuthLoading(false);
      }
      return;
    }

    try {
      const entitlementData = await getUserEntitledSystems();
      if (!isMountedRef.current) return;

      const status = classifyEntitlementResult({ data: entitlementData, platform });
      setAuthStatus(status);

      if (status === 'authorized') {
        loadCatalog(false);
      } else if (status === 'error') {
        const userMsg = 'Não foi possível verificar suas permissões de acesso ao sistema.';
        setError(userMsg);
        logApiError('PlatformCatalog.jsx', 'checkAuthorization', new Error('Falha na consulta de direitos (success: false)'), userMsg);
      }
    } catch (err) {
      console.error('Erro ao verificar direitos:', err);
      if (!isMountedRef.current) return;
      const status = classifyEntitlementResult({ error: err, platform });
      if (status === 'login') {
        clearAuth();
        navigate(buildLoginRedirect(location), { replace: true });
        return;
      }
      setAuthStatus(status);
      const userMsg = 'Falha ao autenticar permissões de acesso ao sistema.';
      setError(userMsg);
      logApiError('PlatformCatalog.jsx', 'checkAuthorization', err, userMsg);
    } finally {
      if (isMountedRef.current) setAuthLoading(false);
    }
  }, [platform, location, navigate]);

  useEffect(() => {
    const isMountedRef = { current: true };
    checkAuthorization(isMountedRef);
    return () => {
      isMountedRef.current = false;
    };
  }, [checkAuthorization]);

  // Filtragem e Ordenação em tempo real no Client
  const filteredGames = useMemo(() => {
    let result = groupedGames;

    // Busca textual
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((g) => {
        return (
          g.displayTitle.toLowerCase().includes(q) ||
          g.compKey.includes(q) ||
          (g.genre && g.genre.toLowerCase().includes(q)) ||
          g.versions.some((v) => v.rawPath.toLowerCase().includes(q))
        );
      });
    }

    // Filtro por Região / Idioma
    if (selectedRegion === 'br') {
      result = result.filter((g) => g.isPTBR);
    } else if (selectedRegion === 'usa') {
      result = result.filter((g) => g.regions.has('USA'));
    } else if (selectedRegion === 'eur') {
      result = result.filter((g) => g.regions.has('Europa'));
    } else if (selectedRegion === 'jp') {
      result = result.filter((g) => g.regions.has('Japão'));
    }

    // Ordenação: Jogos com capa SEMPRE primeiro; sem capa SEMPRE por último
    return [...result].sort((a, b) => {
      const aHas = a.hasCover ? 1 : 0;
      const bHas = b.hasCover ? 1 : 0;
      if (bHas !== aHas) return bHas - aHas;

      if (sortBy === 'popular') {
        if (b.popularityScore !== a.popularityScore) {
          return b.popularityScore - a.popularityScore;
        }
      }

      return a.displayTitle.localeCompare(b.displayTitle, 'pt-BR');
    });
  }, [groupedGames, searchQuery, selectedRegion, sortBy]);

  // Observer de Scroll Infinito
  const handleObserver = useCallback(
    (entries) => {
      const target = entries[0];
      if (target.isIntersecting) {
        setRenderedCount((prev) => Math.min(prev + BATCH_SIZE, filteredGames.length));
      }
    },
    [filteredGames.length]
  );

  useEffect(() => {
    const option = { rootMargin: '300px' };
    const observer = new IntersectionObserver(handleObserver, option);
    if (sentinelRef.current) observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [handleObserver]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const visibleGames = useMemo(() => {
    return filteredGames.slice(0, renderedCount);
  }, [filteredGames, renderedCount]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-center">
        <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-4" />
        <h2 className="text-lg font-bold text-white mb-1">Verificando Direitos de Acesso...</h2>
        <p className="text-xs text-gray-400">Consultando sistemas liberados na sua conta.</p>
      </div>
    );
  }

  // Plataforma Inexistente
  if (!platform) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Sistema Não Encontrado</h2>
        <p className="text-sm text-gray-400 max-w-sm mb-6">
          A plataforma solicitada não existe ou foi descontinuada.
        </p>
        <Link
          to="/acesso"
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs"
        >
          Voltar para Meus Sistemas
        </Link>
      </div>
    );
  }

  // Erro na consulta de direitos (rede/5xx/resposta inválida) — permite tentar novamente
  if (authStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full p-6 rounded-2xl bg-red-950/40 border border-red-500/30 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">Erro ao verificar permissões</h2>
          <p className="text-xs text-gray-400 mb-5">
            {error || 'Falha ao autenticar permissões de acesso ao sistema.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => checkAuthorization({ current: true })}
              className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-gray-950 font-bold text-xs transition-colors"
            >
              Tentar Novamente
            </button>
            <Link
              to="/acesso"
              className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white font-bold text-xs transition-colors"
            >
              Voltar para Meus Sistemas
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Guard de Acesso Restrito (somente quando a consulta respondeu com sucesso e o sistema não consta)
  if (authStatus !== 'authorized') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 shadow-lg shadow-red-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Acesso Restrito</h2>
        <p className="text-sm text-gray-400 max-w-md mb-6">
          Sua conta não possui permissão para acessar os jogos de{' '}
          <strong className="text-white">{platform.name}</strong>. Adquira o pacote
          correspondente na Área do Cliente para liberar o acervo completo.
        </p>
        <div className="flex items-center gap-3">
          <Link
            to="/acesso"
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs transition-colors"
          >
            Ver Meus Sistemas Liberados
          </Link>
          <Link
            to="/area-cliente"
            className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white font-bold text-xs transition-colors"
          >
            Ir para Área do Cliente
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col font-sans">
      {/* Header da Plataforma */}
      <header className="sticky top-0 z-30 bg-gray-950/85 backdrop-blur-md border-b border-gray-800/80">
        <div className="access-container flex items-center justify-between py-3.5 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            {fromHub && (
              <Link
                to="/acesso"
                style={{ color: '#ffffff' }}
                className="btn-nav-header shrink-0 active:scale-95"
                title="Voltar para a tela principal"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400" />
                <span style={{ color: '#ffffff' }}>Voltar</span>
              </Link>
            )}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0"
              style={{
                background: platform.accent || '#10b981',
                boxShadow: `0 0 16px ${platform.accent || '#10b981'}44`,
              }}
            >
              <Gamepad2 className="w-5 h-5 text-gray-950" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight flex items-center gap-2">
                <span>Catálogo {platform.name}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-gray-200 border border-white/20">
                  {platform.shortName}
                </span>
              </h1>
              <p className="text-xs text-gray-400">
                {groupedGames.length > 0
                  ? `${groupedGames.length.toLocaleString('pt-BR')} Títulos Oficiais Disponíveis`
                  : 'Acervo oficial completo e atualizado'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/area-cliente"
              style={{ color: '#ffffff' }}
              className="btn-nav-header"
            >
              <span style={{ color: '#ffffff' }}>Área do Cliente</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo do Catálogo */}
      <main className="flex-1 access-container py-6">
        {/* Banner do Sistema */}
        <div
          className="rounded-2xl p-6 sm:p-8 mb-6 border relative overflow-hidden flex flex-col justify-between"
          style={{
            background: `linear-gradient(135deg, ${platform.headerBg || '#0f172a'} 0%, #090d16 100%)`,
            borderColor: `${platform.accent || '#10b981'}33`,
          }}
        >
          <div className="relative z-10 max-w-2xl">
            <div className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 mb-2">
              Acesso Liberado
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              {platform.name}
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              {platform.tagline}
            </p>
          </div>
        </div>

        {/* Toolbar de Filtros e Busca */}
        <CatalogToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearSearch={() => setSearchQuery('')}
          selectedRegion={selectedRegion}
          onRegionChange={setSelectedRegion}
          sortBy={sortBy}
          onSortChange={setSortBy}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          filteredCount={filteredGames.length}
          platformName={platform.name}
        />

        {/* Estado de Carregamento do Acervo */}
        {catalogLoading && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
            <p className="text-base font-bold text-white mb-1">
              Carregando catálogo de {platform.name}...
            </p>
            <p className="text-xs text-gray-400">
              Agrupando edições e ordenando pelos mais populares.
            </p>
          </div>
        )}

        {/* Estado de Erro de Conexão */}
        {error && !catalogLoading && (
          <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-red-950/40 border border-red-500/30 text-center">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-2">Erro ao carregar catálogo</h3>
            <p className="text-xs text-gray-400 mb-5">{error}</p>
            <button
              onClick={() => loadCatalog(true)}
              className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-gray-950 font-bold text-xs"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Estado Vazio de Busca */}
        {!catalogLoading && !error && filteredGames.length === 0 && (
          <div className="py-20 text-center text-gray-400">
            <p className="text-base font-bold text-white mb-1">Nenhum jogo encontrado</p>
            <p className="text-xs max-w-sm mx-auto mb-4">
              Não encontramos jogos correspondentes a "<strong>{searchQuery}</strong>" com os filtros aplicados.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedRegion('all');
              }}
              className="px-4 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs font-bold text-emerald-400 hover:text-emerald-300"
            >
              Limpar Busca e Filtros
            </button>
          </div>
        )}

        {/* Renderização dos Jogos (Grid 3D ou Lista) */}
        {!catalogLoading && !error && filteredGames.length > 0 && (
          <>
            {viewMode === 'grid' ? (
              <div className="games-grid">
                {visibleGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    platform={platform}
                    viewMode="grid"
                    onSelectGame={setSelectedGame}
                  />
                ))}
              </div>
            ) : (
              <div className="games-list-view">
                {visibleGames.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    platform={platform}
                    viewMode="list"
                    onSelectGame={setSelectedGame}
                  />
                ))}
              </div>
            )}

            {/* Sentinel de Scroll Infinito */}
            {renderedCount < filteredGames.length && (
              <div ref={sentinelRef} className="py-8 flex justify-center">
                <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal de Detalhes do Jogo */}
      {selectedGame && (
        <GameModal
          game={selectedGame}
          platform={platform}
          onClose={() => setSelectedGame(null)}
          onShowToast={showToast}
        />
      )}

      {/* Toast de Feedback */}
      {toastMessage && <div className="toast-msg">{toastMessage}</div>}
    </div>
  );
}
