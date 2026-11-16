const EDGE_FEATHER_MASK = 'linear-gradient(90deg, transparent 0%, #000 10%, #000 90%, transparent 100%)';

const DEFAULT_DARK_STAGE = Object.freeze({
  tone: 'dark',
  background: 'linear-gradient(180deg, #1b2230 0%, #2a3140 100%)',
  maskImage: EDGE_FEATHER_MASK,
});

const DEFAULT_LIGHT_STAGE = Object.freeze({
  tone: 'light',
  background: '#ffffff',
  maskImage: EDGE_FEATHER_MASK,
});

/**
 * Define o fundo inicial antes da leitura de pixels:
 * - Artes conhecidas de fundo branco (ex: multigames) iniciam claras (#ffffff).
 * - Demais caixas iniciam em estadio escuro neutro para nao gerar faixas brancas antes do load.
 */
export function inferInitialStageStyle(src) {
  const value = typeof src === 'string' ? src.toLowerCase() : '';
  if (value.includes('multigames') || value.includes('white')) {
    return DEFAULT_LIGHT_STAGE;
  }
  return DEFAULT_DARK_STAGE;
}

function rgb(r, g, b) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function avgPixel(pixels) {
  const total = pixels.reduce(
    (acc, p) => ({ r: acc.r + p.r, g: acc.g + p.g, b: acc.b + p.b }),
    { r: 0, g: 0, b: 0 },
  );
  const count = Math.max(1, pixels.length);
  return { r: total.r / count, g: total.g / count, b: total.b / count };
}

function luminance({ r, g, b }) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Classifica amostras das bordas [topLeft, topRight, bottomLeft, bottomRight]
 * e devolve o palco de fundo correspondente ao estilo real da imagem.
 */
export function classifyCornerSamples(corners) {
  if (!Array.isArray(corners) || corners.length < 4) {
    return DEFAULT_DARK_STAGE;
  }

  const opaqueCorners = corners.filter((c) => (c?.a ?? 255) >= 128);
  if (opaqueCorners.length === 0) {
    return {
      tone: 'dark',
      background: 'radial-gradient(circle at center, #28354d 0%, #151c2c 100%)',
      maskImage: undefined,
    };
  }

  const avgLum = opaqueCorners.reduce((sum, p) => sum + luminance(p), 0) / opaqueCorners.length;
  if (avgLum >= 165) {
    return DEFAULT_LIGHT_STAGE;
  }

  const topAvg = avgPixel(corners.slice(0, 2));
  const bottomAvg = avgPixel(corners.slice(2, 4));
  const midAvg = {
    r: (topAvg.r + bottomAvg.r) / 2,
    g: (topAvg.g + bottomAvg.g) / 2,
    b: (topAvg.b + bottomAvg.b) / 2,
  };

  return {
    tone: 'dark',
    background: `linear-gradient(180deg, ${rgb(topAvg.r, topAvg.g, topAvg.b)} 0%, ${rgb(midAvg.r, midAvg.g, midAvg.b)} 55%, ${rgb(bottomAvg.r, bottomAvg.g, bottomAvg.b)} 100%)`,
    maskImage: EDGE_FEATHER_MASK,
  };
}

/**
 * Amostra os cantos reais da imagem via canvas offscreen com CORS.
 * Falha silenciosamente devolvendo null em ambientes sem canvas (ex: jsdom) ou sem CORS.
 */
export function probeArtworkStageStyle(src) {
  return new Promise((resolve) => {
    if (
      !src ||
      typeof window === 'undefined' ||
      typeof document === 'undefined' ||
      typeof Image === 'undefined'
    ) {
      resolve(null);
      return;
    }

    const probe = new Image();
    probe.crossOrigin = 'anonymous';
    probe.onload = () => {
      try {
        const w = Math.max(16, Math.min(64, probe.naturalWidth || 32));
        const h = Math.max(16, Math.min(64, probe.naturalHeight || 32));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(probe, 0, 0, w, h);
        const pts = [
          [1, 1],
          [w - 2, 1],
          [1, h - 2],
          [w - 2, h - 2],
        ];
        const corners = pts.map(([x, y]) => {
          const d = ctx.getImageData(x, y, 1, 1).data;
          return { r: d[0], g: d[1], b: d[2], a: d[3] };
        });
        resolve(classifyCornerSamples(corners));
      } catch (_) {
        resolve(null);
      }
    };
    probe.onerror = () => resolve(null);
    probe.src = src;
  });
}
