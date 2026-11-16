const EDGE_FEATHER_MASK = 'linear-gradient(90deg, transparent 0%, #000 10%, #000 90%, transparent 100%)';

const TRANSPARENT_CUTOUT_STAGE = Object.freeze({
  tone: 'transparent',
  background: 'radial-gradient(circle at 50% 45%, rgba(56, 189, 248, 0.14) 0%, #1e293b 78%)',
  maskImage: undefined,
  dropShadow: 'drop-shadow(0 16px 24px rgba(2, 6, 23, 0.55))',
});

const DEFAULT_DARK_STAGE = Object.freeze({
  tone: 'dark',
  background: 'linear-gradient(180deg, #1b2230 0%, #2a3140 100%)',
  maskImage: EDGE_FEATHER_MASK,
  dropShadow: undefined,
});

const DEFAULT_LIGHT_STAGE = Object.freeze({
  tone: 'light',
  background: '#ffffff',
  maskImage: EDGE_FEATHER_MASK,
  dropShadow: undefined,
});

const BOX_CUTOUT_MAP = Object.freeze({
  'arcade.png': '/images/boxes/arcade.webp',
  'arcade.webp': '/images/boxes/arcade.webp',
  'gold_box.png': '/images/boxes/gold_box.webp',
  'gold_box.webp': '/images/boxes/gold_box.webp',
  'moder.png': '/images/boxes/moder.webp',
  'moder.webp': '/images/boxes/moder.webp',
  'multigames.png': '/images/boxes/multigames.webp',
  'multigames.webp': '/images/boxes/multigames.webp',
  'multigamesbox.webp': '/images/boxes/plataformamultigames.webp',
  'nintendocollection.webp': '/images/boxes/nintendocollection.webp',
  'nintendocollection.png': '/images/boxes/nintendocollection.webp',
  'plataformamultigames.jpeg': '/images/boxes/plataformamultigames.webp',
  'plataformamultigames.jpg': '/images/boxes/plataformamultigames.webp',
  'plataformamultigames.png': '/images/boxes/plataformamultigames.webp',
  'ps1ps3psp.webp': '/images/boxes/ps1ps3psp.webp',
  'ps1ps3psp.png': '/images/boxes/ps1ps3psp.webp',
  'psvita.png': '/images/boxes/psvita.webp',
  'psvita.webp': '/images/boxes/psvita.webp',
  'saturnbox.webp': '/images/boxes/saturnbox.webp',
  'saturnbox.png': '/images/boxes/saturnbox.webp',
  'switchbox.webp': '/images/boxes/switchbox.webp',
  'switchbox.png': '/images/boxes/switchbox.webp',
  'vintage_box.png': '/images/boxes/vintage_box.webp',
  'vintage_box.webp': '/images/boxes/vintage_box.webp',
  'xbox360.webp': '/images/boxes/xbox360.webp',
  'xbox360.png': '/images/boxes/xbox360.webp',
  'xboxclassicbox.webp': '/images/boxes/xboxclassicbox.webp',
  'xboxclassicbox.png': '/images/boxes/xboxclassicbox.webp',
});

/**
 * Mapeia URLs conhecidas do catalogo de jogos para recortes transparentes locais em /images/boxes/*.webp.
 */
export function resolveTransparentBoxCutout(src) {
  if (!src || typeof src !== 'string') return null;
  const clean = src.split('?')[0].split('#')[0].trim().toLowerCase();
  const baseName = clean.slice(clean.lastIndexOf('/') + 1);
  return BOX_CUTOUT_MAP[baseName] || null;
}

export function inferInitialStageStyle(src) {
  if (resolveTransparentBoxCutout(src)) {
    return TRANSPARENT_CUTOUT_STAGE;
  }
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
    return TRANSPARENT_CUTOUT_STAGE;
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
    dropShadow: undefined,
  };
}

/**
 * Amostra os cantos reais da imagem via canvas offscreen com CORS.
 * Falha silenciosamente devolvendo null em ambientes sem canvas (ex: jsdom) ou sem CORS.
 */
export function probeArtworkStageStyle(src) {
  if (resolveTransparentBoxCutout(src)) {
    return Promise.resolve(TRANSPARENT_CUTOUT_STAGE);
  }
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
