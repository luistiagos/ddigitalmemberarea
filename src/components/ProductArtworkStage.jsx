import { useEffect, useState } from 'react';
import {
  inferInitialStageStyle,
  probeArtworkStageStyle,
} from '@/utils/artworkStage';

/**
 * Container de exibicao de capa que adapta o fundo ao estilo real da imagem:
 * - Artes com studio branco permanecem em fundo branco limpo.
 * - Artes com fundo escuro adotam gradiente amostrado das bordas + suavizacao lateral
 *   para eliminar faixas brancas ou recortes contrastantes nos cards bloqueados.
 */
export default function ProductArtworkStage({
  imgSrc,
  title,
  onImageError,
  imagePaddingClass = 'p-2.5',
  aspectClass = 'aspect-[16/10]',
  children,
}) {
  const [stage, setStage] = useState(() => inferInitialStageStyle(imgSrc));

  useEffect(() => {
    let active = true;
    setStage(inferInitialStageStyle(imgSrc));

    probeArtworkStageStyle(imgSrc).then((detected) => {
      if (active && detected) {
        setStage(detected);
      }
    });

    return () => {
      active = false;
    };
  }, [imgSrc]);

  return (
    <div
      data-artwork-stage="true"
      data-stage-tone={stage.tone}
      style={{ background: stage.background }}
      className={`relative w-full ${aspectClass} overflow-hidden shrink-0 ${
        stage.tone === 'light' ? 'bg-white border-b border-slate-200/80' : 'border-b border-white/10'
      }`}
    >
      <img
        src={imgSrc}
        alt={title}
        onError={onImageError}
        style={
          stage.maskImage
            ? { WebkitMaskImage: stage.maskImage, maskImage: stage.maskImage }
            : undefined
        }
        className={`w-full h-full object-contain ${imagePaddingClass} transition-transform duration-300 group-hover:scale-[1.03]`}
      />
      {children}
    </div>
  );
}
