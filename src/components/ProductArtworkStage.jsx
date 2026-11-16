import { useEffect, useState } from 'react';
import {
  inferInitialStageStyle,
  probeArtworkStageStyle,
  resolveTransparentBoxCutout,
} from '@/utils/artworkStage';

/**
 * Container de exibicao de capa estilo Checkout (.order-thumb / .bump-thumb):
 * - Moldura interna quadrada arredondada (#0f172a com borda sutil slate-600/80)
 *   centralizada dentro do palco do card, preservando a caixa 3D completa com lombada
 *   e evitando sobreposicao com os selos de status/desconto nos cantos.
 */
export default function ProductArtworkStage({
  imgSrc,
  title,
  onImageError,
  imagePaddingClass = 'p-2',
  aspectClass = 'aspect-[16/10] p-3',
  framed = true,
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

  const imgEl = (
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
  );

  return (
    <div
      data-artwork-stage="true"
      data-stage-tone={stage.tone}
      style={{ background: framed ? '#1e293b' : stage.background }}
      className={`relative w-full ${aspectClass} flex items-center justify-center overflow-hidden shrink-0 ${
        stage.tone === 'light' && !framed ? 'bg-white border-b border-slate-200/80' : 'border-b border-white/10'
      }`}
    >
      {framed ? (
        <div
          data-checkout-frame="true"
          style={stage.tone === 'light' ? { background: '#ffffff' } : undefined}
          className={`h-full aspect-square max-w-full rounded-xl border shadow-lg shadow-slate-950/60 flex items-center justify-center overflow-hidden ${
            stage.tone === 'light'
              ? 'border-slate-300 bg-white'
              : 'border-slate-600/80 bg-[#0f172a]'
          }`}
        >
          {imgEl}
        </div>
      ) : (
        imgEl
      )}
      {children}
    </div>
  );
}
