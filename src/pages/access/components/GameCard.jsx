import { useState } from 'react';
import { Download, Disc3, Layers } from 'lucide-react';

export function GameCard({ game, platform, viewMode, onSelectGame }) {
  const [imgError, setImgError] = useState(false);

  const primaryVersion = game.versions?.[0] || {};
  const downloadLink = primaryVersion.link || '#';
  const consoleName = platform?.shortName || 'OFICIAL';
  const caseClass = platform?.caseClass || 'case-ps2';

  if (viewMode === 'list') {
    return (
      <div
        className="game-list-row"
        role="button"
        tabIndex={0}
        onClick={() => onSelectGame(game)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectGame(game);
          }
        }}
      >
        <div className="game-list-row-left">
          {game.coverUrl && !imgError ? (
            <img
              src={game.coverUrl}
              alt={game.displayTitle}
              className="game-list-thumb"
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="game-list-thumb flex items-center justify-center text-xs font-bold text-gray-500 bg-gray-900 border border-gray-800">
              {consoleName}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="game-list-title" title={game.displayTitle}>
              {game.displayTitle}
            </span>
            <div className="flex items-center gap-2 mt-1">
              {game.isPTBR && <span className="case-badge badge-br text-[9px]">🇧🇷 PT-BR</span>}
              {game.discsLabel && <span className="case-badge badge-multidisc text-[9px]">{game.discsLabel}</span>}
              {game.versionsCount > 1 && <span className="case-badge badge-versions text-[9px]">{game.versionsCount} Versões</span>}
              {game.genre && <span className="text-xs text-gray-400">• {game.genre}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <span className="text-xs font-semibold text-gray-400">
            {game.bestSizeFormatted || 'Digital'}
          </span>
          <a
            href={downloadLink}
            target="_blank"
            rel="noopener noreferrer"
            download
            onClick={(e) => e.stopPropagation()}
            className="game-btn-download !w-auto px-3 py-1.5 text-xs"
            title={`Baixar ${game.displayTitle}`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="game-card"
      role="button"
      tabIndex={0}
      onClick={() => onSelectGame(game)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectGame(game);
        }
      }}
      aria-label={game.displayTitle}
    >
      <div className="game-box-3d">
        <div className="game-box-inner">
          <div className={`case-header-band ${caseClass}`}>
            <span>{consoleName}</span>
            <span>DVD-ROM</span>
          </div>

          <div className="box-badges">
            {game.isPTBR && <span className="case-badge badge-br">🇧🇷 PT-BR</span>}
            {game.discsLabel && <span className="case-badge badge-multidisc">{game.discsLabel}</span>}
            {game.versionsCount > 1 && !game.discsLabel && (
              <span className="case-badge badge-versions">{game.versionsCount} Versões</span>
            )}
          </div>

          <div className="box-art-img-wrap">
            {game.coverUrl && !imgError ? (
              <img
                src={game.coverUrl}
                alt={game.displayTitle}
                className="box-art-img"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="box-art-fallback">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{consoleName}</span>
                <Disc3 className="w-10 h-10 text-gray-600 my-2 animate-spin-slow" />
                <span className="fallback-title">{game.displayTitle}</span>
                <span className="text-[9px] text-emerald-400 mt-1 uppercase font-semibold">Edição Oficial</span>
              </div>
            )}

            <div className="card-hover-overlay">
              <span className="overlay-btn">Ver Opções &amp; Detalhes</span>
            </div>
          </div>
        </div>
      </div>

      <div className="game-card-meta">
        <div className="game-card-title" title={game.displayTitle}>
          {game.displayTitle}
        </div>
        <div className="game-card-tags">
          {game.bestSizeFormatted && (
            <span className="game-tag-pill">💾 {game.bestSizeFormatted}</span>
          )}
          {game.genre && (
            <span className="game-tag-pill truncate max-w-[110px]">• {game.genre}</span>
          )}
        </div>
        <a
          href={downloadLink}
          target="_blank"
          rel="noopener noreferrer"
          download
          onClick={(e) => e.stopPropagation()}
          className="game-btn-download"
          title={`Baixar ${game.displayTitle}`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Baixar ROM</span>
        </a>
      </div>
    </div>
  );
}

