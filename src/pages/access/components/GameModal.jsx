import { useState, useEffect } from 'react';
import { X, Download, Copy, Disc, Check, HardDrive, Globe, Tag } from 'lucide-react';

export function GameModal({ game, platform, onClose, onShowToast }) {
  const [selectedVersionIdx, setSelectedVersionIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!game) return null;

  const versions = game.versions || [];
  const currentVersion = versions[selectedVersionIdx] || versions[0] || {};
  const downloadLink = currentVersion.link || game.versions?.[0]?.link || '#';
  const consoleName = platform?.name || 'Sistema Oficial';

  const handleCopyLink = () => {
    if (!downloadLink || downloadLink === '#') {
      onShowToast('Link de download indisponível.');
      return;
    }

    navigator.clipboard
      .writeText(downloadLink)
      .then(() => {
        setCopied(true);
        onShowToast('Link de download copiado para a área de transferência!');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        onShowToast('Não foi possível copiar o link.');
      });
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Fechar modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="modal-content-grid">
          {/* Capa do Jogo */}
          <div className="flex flex-col items-center">
            <div className="modal-box-preview">
              {game.coverUrl && !imgError ? (
                <img
                  src={game.coverUrl}
                  alt={game.displayTitle}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="box-art-fallback h-full flex flex-col items-center justify-center p-4 text-center bg-gray-950">
                  <span className="text-xs font-bold text-gray-400">{platform?.shortName}</span>
                  <Disc className="w-12 h-12 text-gray-600 my-4 animate-spin-slow" />
                  <span className="text-xs font-semibold text-gray-300">{game.displayTitle}</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5 justify-center">
              {game.isPTBR && (
                <span className="case-badge badge-br text-[10px]">🇧🇷 PT-BR</span>
              )}
              {game.discsLabel && (
                <span className="case-badge badge-multidisc text-[10px]">{game.discsLabel}</span>
              )}
              {versions.length > 1 && (
                <span className="case-badge badge-versions text-[10px]">{versions.length} Versões</span>
              )}
            </div>
          </div>

          {/* Detalhes & Ações */}
          <div className="flex flex-col justify-between">
            <div>
              <div className="inline-block text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
                {consoleName}
              </div>
              <h2 className="text-2xl font-black text-white leading-tight mb-4">
                {game.displayTitle}
              </h2>

              {/* Informações Técnicas */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-gray-900/80 border border-gray-800 text-xs mb-5">
                <div className="flex items-center gap-2 text-gray-300">
                  <HardDrive className="w-4 h-4 text-gray-500" />
                  <span>Tamanho: <strong className="text-white">{currentVersion.sizeFormatted || game.bestSizeFormatted || 'Digital'}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Tag className="w-4 h-4 text-gray-500" />
                  <span>Formato: <strong className="text-white">{currentVersion.format || 'ISO'}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Globe className="w-4 h-4 text-gray-500" />
                  <span>Região: <strong className="text-white">{currentVersion.region || game.regionsLabel || 'Global'}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Disc className="w-4 h-4 text-gray-500" />
                  <span>Gênero: <strong className="text-white">{game.genre || 'Clássico'}</strong></span>
                </div>
              </div>

              {/* Seletor de Versões / Discos */}
              {versions.length > 1 && (
                <div className="mb-5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Escolha a Versão / Disco:
                  </label>
                  <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {versions.map((v, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedVersionIdx(idx)}
                        className={`text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between border ${
                          selectedVersionIdx === idx
                            ? 'bg-emerald-500/15 border-emerald-500 text-white'
                            : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:border-gray-700'
                        }`}
                      >
                        <span className="truncate max-w-[280px]" title={v.rawPath}>
                          {v.disc ? `${v.disc} — ` : ''}{v.rawPath}
                        </span>
                        <span className="text-[11px] shrink-0 font-semibold text-gray-300 ml-2">
                          {v.sizeFormatted || v.format}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Ações de Download */}
            <div className="flex flex-col gap-2.5 pt-4 border-t border-gray-800">
              <a
                href={downloadLink}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-gray-950 font-black text-sm py-3 px-6 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01]"
              >
                <Download className="w-5 h-5" />
                <span>
                  Baixar Jogo {currentVersion.sizeFormatted ? `(${currentVersion.sizeFormatted})` : ''}
                </span>
              </a>

              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white font-semibold text-xs py-2.5 px-4 border border-gray-800 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Link Copiado com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Link Direto de Download</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

