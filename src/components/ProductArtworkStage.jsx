import { useEffect, useState } from 'react';
import {
  inferInitialStageStyle,
  probeArtworkStageStyle,
  resolveTransparentBoxCutout,
} from '@/utils/artworkStage';

/**
 * Container de exibicao de capa:
 * - Usa recortes transparentes locais (/images/boxes/*.webp) quando disponiveis,
 *   aplicando iluminacao suave e drop-shadow 3D direto sobre o card.
 * - Para imagens externas sem recorte (ex: papelaria/figurinhas), adapta o palco
 *   por amostragem de bordas para evitar contrastes abruptos.
 */
export default function ProductArtworkStage({
  imgSrc,
  title,
  onImageError,
  imagePaddingClass = 'p-2.5',
  aspectClass = 'aspect-[16/10]',
  children,
}) {
  const cutoutUrl = resolveTransparentBoxCutout(imgSrc);
  const [activeSrc, setActiveSrc] = useState(() => cutoutUrl || imgSrc);
  const [stage, setStage] = useState(() => inferInitialStageStyle(cutoutUrl || imgSrc));

  useEffect(() => {
    let active = true;
    const initialUrl = cutoutUrl || imgSrc;
    setActiveSrc(initialUrl);
    setStage(inferInitialStageStyle(imgSrc));

    if (!cutoutUrl) {
      probeArtworkStageStyle(initialUrl).then((detected) => {
        if (active && detected) {
          setStage(detected);
        }
      });
    }

    return () => {
      active = false;
    };
  }, [imgSrc, cutoutUrl]);

  const handleError = () => {
    if (cutoutUrl && activeSrc === cutoutUrl && imgSrc !== cutoutUrl) {
      setActiveSrc(imgSrc);
      setStage(inferInitialStageStyle(imgSrc));
      return;
    }
    onImageError?.();
  };

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
        src={activeSrc}
        alt={title}
        onError={handleError}
        style={{
          ...(stage.maskImage ? { WebkitMaskImage: stage.maskImage, maskImage: stage.maskImage } : {}),
          ...(stage.dropShadow ? { filter: stage.dropShadow } : {}),
        }}
        className={`w-full h-full object-contain ${imagePaddingClass} transition-transform duration-300 group-hover:scale-[1.03]`}
      />
      {children}
    </div>
  );
}
