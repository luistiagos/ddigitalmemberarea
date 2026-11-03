import { Search, X, LayoutGrid, List } from 'lucide-react';

export function CatalogToolbar({
  searchQuery,
  onSearchChange,
  onClearSearch,
  selectedRegion,
  onRegionChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  filteredCount,
  platformName,
}) {
  const regions = [
    { id: 'all', label: 'Todos' },
    { id: 'br', label: '🇧🇷 PT-BR' },
    { id: 'usa', label: '🇺🇸 USA' },
    { id: 'eur', label: '🇪🇺 Europa' },
    { id: 'jp', label: '🇯🇵 Japão' },
  ];

  return (
    <div className="w-full bg-gray-900/90 backdrop-blur-md border border-gray-800 rounded-2xl p-4 sm:p-5 shadow-xl shadow-black/40 mb-6">
      {/* Linha 1: Input de Busca + Select Ordenação + Botões de View */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 mb-4">
        {/* Barra de Busca */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              platformName
                ? `Buscar jogos em ${platformName}...`
                : 'Buscar por título, gênero ou palavra-chave...'
            }
            className="w-full h-11 pl-11 pr-10 rounded-xl bg-gray-950/80 border border-gray-800 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-colors"
              title="Limpar busca"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Controles da Direita */}
        <div className="flex items-center gap-2.5 shrink-0 justify-between md:justify-end">
          {/* Ordenação */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="h-11 px-3.5 rounded-xl bg-gray-950/80 border border-gray-800 text-xs font-semibold text-gray-300 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
          >
            <option value="popular">Mais Populares</option>
            <option value="az">Ordem Alfabética (A-Z)</option>
          </select>

          {/* Alternador de Visualização (Grid vs Lista) */}
          <div className="flex items-center bg-gray-950/80 border border-gray-800 rounded-xl p-1">
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Visualização em Grade 3D"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Visualização em Lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Linha 2: Chips de Região + Contador de Jogos */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-gray-800/60">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mr-1">
            Filtros:
          </span>
          {regions.map((reg) => (
            <button
              key={reg.id}
              type="button"
              onClick={() => onRegionChange(reg.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                selectedRegion === reg.id
                  ? 'bg-emerald-500 text-gray-950 shadow-md shadow-emerald-500/20'
                  : 'bg-gray-950/60 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
              }`}
            >
              {reg.label}
            </button>
          ))}
        </div>

        <div className="text-xs font-semibold text-gray-400 shrink-0">
          Exibindo <span className="text-white font-bold">{filteredCount}</span> {filteredCount === 1 ? 'título' : 'títulos'}
        </div>
      </div>
    </div>
  );
}
