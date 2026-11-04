/**
 * Processador, normalizador e deduplicador do acervo de jogos (Área de Membros)
 */

export const MASTER_HITS = [
  'san andreas', 'grand theft auto', 'vice city', 'gta',
  'god of war', 'shadow of the colossus', 'gran turismo', 'the last of us', 'uncharted',
  'resident evil 4', 'resident evil', 'silent hill 2', 'silent hill',
  'need for speed', 'most wanted', 'underground 2', 'underground', 'carbon', 'midnight club', 'burnout',
  'budokai tenkaichi 3', 'dragon ball', 'shippuden', 'naruto', 'shaolin monks', 'mortal kombat', 'tekken', 'def jam', 'street fighter',
  'bomba patch', 'pes 20', 'winning eleven', 'fifa', 'downhill domination',
  'bully', 'black', 'devil may cry 3', 'devil may cry', 'metal gear', 'kingdom hearts', 'final fantasy x', 'hit & run', 'simpsons',
  'mario kart', 'super mario galaxy', 'super mario', 'twilight princess', 'zelda', 'smash bros', 'pokemon', 'donkey kong',
  'halo 3', 'halo', 'gears of war', 'forza', 'red dead redemption'
];

export const POPULAR_KEYWORDS = [
  'grand theft auto', 'gta', 'san andreas', 'vice city', 'liberty city',
  'god of war', 'resident evil', 'biohazard', 'silent hill',
  'need for speed', 'underground', 'most wanted', 'carbon', 'prostreet',
  'dragon ball', 'budokai', 'tenkaichi', 'naruto', 'shippuden',
  'mortal kombat', 'street fighter', 'tekken', 'king of fighters', 'kof',
  'bomba patch', 'pes 20', 'pro evolution soccer', 'winning eleven', 'fifa',
  'crash bandicoot', 'crash', 'spyro', 'tony hawk',
  'metal gear', 'mgs', 'snake eater', 'devil may cry', 'dmc',
  'shadow of the colossus', 'kingdom hearts', 'final fantasy',
  'black', 'bully', 'def jam', 'burnout', 'midnight club',
  'call of duty', 'medal of honor', 'battlefield',
  'super mario', 'mario kart', 'mario galaxy', 'zelda', 'the legend of zelda',
  'donkey kong', 'pokemon', 'pokémon', 'metroid', 'kirby', 'smash bros',
  'halo', 'gears of war', 'forza', 'fable', 'left 4 dead',
  'red dead', 'red dead redemption', 'the last of us', 'uncharted',
  'spider-man', 'spiderman', 'batman', 'arkham', 'castlevania',
  'gran turismo', 'guitar hero', 'rock band', 'sonic the hedgehog',
  'sonic', 'tomb raider', 'lara croft', 'assassin', 'monster hunter',
  'persona', 'yakuza', 'dark souls', 'demon souls', 'max payne',
  'god hand', 'downhill domination', 'mx vs atv', 'def jam fight for ny',
  'ben 10', 'simpsons', 'hit & run', 'yu-gi-oh', 'lego'
];

export function getBaseTitle(raw) {
  if (!raw) return 'Jogo sem título';
  let title = raw.includes('/') || raw.includes('\\')
    ? raw.substring(Math.max(raw.lastIndexOf('/'), raw.lastIndexOf('\\')) + 1)
    : raw;
  return title
    .replace(/\.(iso|rvz|chd|cso|wbfs|nsp|xci|nsz|rar|7z|zip|bin|cue|gdi|cdi|sfc|smc|z64|n64|md|gen|pkg)$/i, '')
    .replace(/^[A-Z]{3,4}[-_][0-9]{3,5}\.[0-9]{2}\./i, '')
    .replace(/\[[0-9A-Fa-f]{16}\]/g, '')
    .replace(/\s*\(.*?\)/g, '')
    .replace(/\s*\[.*?\]/g, '')
    .replace(/^[-\s_]+|[-\s_]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function getComparisonKey(baseTitle) {
  let key = (baseTitle || '').toLowerCase();
  key = key.replace(/\bbrasil\b/g, 'brazil');
  key = key.replace(/\ba era do gelo\b/g, 'ice age');
  key = key.replace(/\bac\b/g, "assassin's creed");

  key = key.replace(/\bxv\b/g, '15')
    .replace(/\bxiv\b/g, '14')
    .replace(/\bxiii\b/g, '13')
    .replace(/\bxii\b/g, '12')
    .replace(/\bxi\b/g, '11')
    .replace(/\bx\b/g, '10')
    .replace(/\bix\b/g, '9')
    .replace(/\bviii\b/g, '8')
    .replace(/\bvii\b/g, '7')
    .replace(/\bvi\b/g, '6')
    .replace(/\biv\b/g, '4')
    .replace(/\biii\b/g, '3')
    .replace(/\bii\b/g, '2')
    .replace(/\bv\b/g, '5');

  key = key.replace(/\b(aus|usa|eur|pal|uk|jp|jpn|rf|regionfree|region\s+free|asia|ntsc|kor|chn|eng|spa|ger|fra|ita|rus|por|free)$/g, '').trim();
  return key.replace(/[^a-z0-9]/g, '');
}

export function getCanonicalGameKey(baseTitle) {
  let s = (baseTitle || '').toLowerCase();
  s = s
    .replace(/\b(dublado|legendado|traduzido|tradu[cç][aã]o|pt[\s_-]*br|portugues|português|espanhol|english|iso|rom|chd|wbfs|pkg|ps1|psx|ps2|ps3|psp|snes|nes|n64|wii|gamecube|ngc|switch|xbox|xbox360|gba|gbc|gb|nds|3ds|megadrive|genesis|dreamcast|saturn|arcade|mame|finalburn|neogeo|cps1|cps2|cps3|atomiswave|naomi)\b/gi, ' ')
    .replace(/\b(remastered|remaster|definitive\s+edition|complete\s+edition|special\s+edition|collector'?s\s+edition|game\s+of\s+the\s+year\s+edition|goty\s+edition|greatest\s+hits|platinum|black\s+label|redump|no[\s_-]*intro)\b/gi, ' ')
    .replace(/\b(e|em|de|do|da|para|com|by)\b/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return getComparisonKey(s);
}

export function isCompatibleForCoverMerge(titleA, titleB) {
  const canA = getCanonicalGameKey(titleA);
  const canB = getCanonicalGameKey(titleB);
  if (!canA || !canB) return false;
  if (canA === canB) return true;

  const compA = getComparisonKey(titleA);
  const compB = getComparisonKey(titleB);
  if (!compA || !compB) return false;
  if (compA === compB) return true;

  const shorter = compA.length <= compB.length ? compA : compB;
  const longer = compA.length <= compB.length ? compB : compA;
  if (shorter.length < 6) return false;
  if (!longer.startsWith(shorter)) return false;

  const rest = longer.slice(shorter.length);
  if (!rest) return true;
  if (/^\d/.test(rest)) return false;
  if (
    shorter.includes('gta') ||
    shorter.includes('grandtheftauto') ||
    shorter.includes('bombapatch') ||
    shorter.includes('pes20') ||
    shorter.includes('winningeleven') ||
    shorter.includes('fifa')
  ) {
    return false;
  }
  if (
    /^(plus|turbo|alpha|zero|super|hyper|ultra|remix|arcade|collection|anthology|trilogy|chronicles|origins|legends|generations|evolution|unleashed|revelations|remake|rebirth|returns|revenge|forever|world|gaiden|special|dx|ex)/.test(
      rest
    )
  ) {
    return false;
  }
  return true;
}

export function extractRegion(str) {
  if (!str) return '';
  if (/\b(Brazil|Brasil|PT-BR|Dublado|Legendado|Traduzido|Bomba Patch)\b/i.test(str)) return 'Brasil';
  if (/\b(USA|US)\b/i.test(str)) return 'USA';
  if (/\b(Europe|En,Fr,De|En,Es,It|PAL)\b/i.test(str)) return 'Europa';
  if (/\b(Japan|JP|NTSC-J)\b/i.test(str)) return 'Japão';
  return '';
}

export function extractDisc(str) {
  const discMatch = str.match(/\((Disc|Disk|DVD|CD)\s*([0-9]+)[^)]*\)/i) || str.match(/\[(Disc|Disk|DVD|CD)\s*([0-9]+)[^\]]*\]/i);
  return discMatch ? `Disco ${discMatch[2]}` : '';
}

export function formatBytes(bytes) {
  if (!bytes) return '';
  if (typeof bytes === 'string' && isNaN(Number(bytes))) {
    return bytes;
  }
  const n = Number(bytes);
  if (isNaN(n) || n <= 0) return '';
  const gb = n / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = n / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(0)} MB`;
  return `${Math.round(n / 1024)} KB`;
}

export function resolveCoverUrl(entry) {
  let url = entry.cover2d_url || entry.image_url;
  if (url && typeof url === 'string') {
    url = url.trim();
    if (url.startsWith('http://')) {
      url = url.replace(/^http:\/\//i, 'https://');
    }
    return url;
  }
  return null;
}

export function resolveVersionDownloadLink(versions, selectedVersionIdx = 0) {
  if (!Array.isArray(versions) || versions.length === 0) return '#';
  const currentVersion = versions[selectedVersionIdx] || versions[0] || {};
  return currentVersion.link || versions[0]?.link || '#';
}

export function getCoverKey(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const clean = url.split('#')[0].split('?')[0];
    const fileName = decodeURIComponent(clean.substring(clean.lastIndexOf('/') + 1));
    if (!fileName) return null;
    const base = getBaseTitle(fileName);
    const comp = getComparisonKey(base);
    return comp || fileName.toLowerCase().replace(/[^a-z0-9]/g, '');
  } catch {
    return url.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}

export function computePopularityScore(displayTitle, rawPath, versionsCount, hasCover, isPTBR) {
  let score = 0;
  const lower = `${displayTitle} ${rawPath}`.toLowerCase();

  for (let i = 0; i < MASTER_HITS.length; i++) {
    const hit = MASTER_HITS[i];
    if (lower.includes(hit)) {
      score += Math.max(500 - i * 6, 250);
      break;
    }
  }

  for (let i = 0; i < POPULAR_KEYWORDS.length; i++) {
    const kw = POPULAR_KEYWORDS[i];
    if (lower.includes(kw)) {
      score += Math.max(250 - i * 3, 80);
      break;
    }
  }

  score += Math.min(versionsCount * 12, 60);
  if (hasCover) score += 50;
  if (isPTBR) score += 40;

  if (/\b(demo|taikenban|trial|sample)\b/i.test(lower)) score -= 500;
  if (/\b(beta|proto|prototype)\b/i.test(lower)) score -= 400;
  if (/\b(promo|kiosk|preview|bonus disc|not for sale)\b/i.test(lower)) score -= 300;

  return score;
}

/**
 * Deduplica e agrupa uma lista crua de entradas de catálogo da plataforma.
 */
export function processAndGroupEntries(rawEntries, platform) {
  if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
    return [];
  }

  let processed = rawEntries;
  if (platform?.filterCustom === 'futebol') {
    processed = rawEntries.filter((e) => {
      const p = (e.path || '').toLowerCase();
      return (
        p.includes('bomba') ||
        p.includes('pes 20') ||
        p.includes('futebol') ||
        p.includes('fifa') ||
        p.includes('we10') ||
        p.includes('brasileir')
      );
    });
  } else if (platform?.filterCustom === 'gta') {
    processed = rawEntries.filter((e) => {
      const p = (e.path || '').toLowerCase();
      return p.includes('gta') || p.includes('grand theft auto');
    });
  }

  const groups = [];
  const coverMap = new Map();
  const titleMap = new Map();

  for (let i = 0; i < processed.length; i++) {
    const entry = processed[i];
    const rawPath = entry.path || '';
    const rawStem = (rawPath.includes('/') || rawPath.includes('\\')
      ? rawPath.substring(Math.max(rawPath.lastIndexOf('/'), rawPath.lastIndexOf('\\')) + 1)
      : rawPath).replace(/\.[^/.]+$/, '').trim();

    let baseTitle = getBaseTitle(rawPath);
    if (entry.name && typeof entry.name === 'string') {
      const cleanEntryName = entry.name.trim();
      const isArcadeStem = /^[a-z0-9_]{1,10}$/i.test(rawStem) && !rawStem.includes(' ');
      if (isArcadeStem && cleanEntryName.length > rawStem.length) {
        baseTitle = cleanEntryName;
      } else if (!baseTitle) {
        baseTitle = cleanEntryName;
      }
    }

    const compKey = getComparisonKey(baseTitle) || rawPath.toLowerCase();
    const coverUrl = resolveCoverUrl(entry);
    const coverKey = getCoverKey(coverUrl);
    const region = extractRegion(rawPath);
    const disc = extractDisc(rawPath);
    const isPTBR = region === 'Brasil' || /\b(Brasil|PT-BR|Dublado|Legendado|Traduzido|Bomba Patch)\b/i.test(rawPath);

    const versionData = {
      rawPath,
      sizeFormatted: formatBytes(entry.size),
      sizeBytes: parseFloat(entry.size) || 0,
      region: region || 'Global',
      disc,
      isPTBR,
      format: (rawPath.split('.').pop() || 'ISO').toUpperCase(),
      coverUrl,
      link: entry.link || '#',
      genre: entry.genre || '',
    };

    let group = null;
    if (coverKey && coverMap.has(coverKey)) {
      const candidate = coverMap.get(coverKey);
      if (candidate && isCompatibleForCoverMerge(candidate.displayTitle, baseTitle)) {
        group = candidate;
      }
    }
    if (!group && compKey && titleMap.has(compKey)) {
      group = titleMap.get(compKey);
    }

    if (group && compKey && titleMap.has(compKey) && titleMap.get(compKey) !== group) {
      const otherGroup = titleMap.get(compKey);
      for (let v = 0; v < otherGroup.versions.length; v++) {
        const ver = otherGroup.versions[v];
        group.versions.push(ver);
        if (ver.disc) group.discs.add(ver.disc);
        if (ver.region) group.regions.add(ver.region);
        if (ver.isPTBR) group.isPTBR = true;
      }
      if (!group.coverUrl && otherGroup.coverUrl) {
        group.coverUrl = otherGroup.coverUrl;
        group.hasCover = true;
      }
      for (let kIdx = 0; kIdx < otherGroup._titleKeys.length; kIdx++) {
        const k = otherGroup._titleKeys[kIdx];
        if (titleMap.get(k) === otherGroup) {
          titleMap.set(k, group);
          group._titleKeys.push(k);
        }
      }
      for (let kIdx = 0; kIdx < otherGroup._coverKeys.length; kIdx++) {
        const k = otherGroup._coverKeys[kIdx];
        if (coverMap.get(k) === otherGroup) {
          coverMap.set(k, group);
          group._coverKeys.push(k);
        }
      }
      otherGroup._merged = true;
    }

    if (!group) {
      group = {
        id: `${platform?.id || 'game'}_${compKey}`,
        displayTitle: baseTitle,
        compKey: compKey,
        coverUrl: coverUrl,
        hasCover: Boolean(coverUrl),
        isPTBR: isPTBR,
        discs: new Set(),
        regions: new Set(),
        genre: entry.genre || '',
        versions: [versionData],
        bestSizeFormatted: versionData.sizeFormatted,
        rawPrimaryPath: rawPath,
        _titleKeys: [],
        _coverKeys: [],
        _merged: false,
      };
      if (disc) group.discs.add(disc);
      if (region) group.regions.add(region);
      groups.push(group);
    } else {
      group.versions.push(versionData);
      if (disc) group.discs.add(disc);
      if (region) group.regions.add(region);
      if (isPTBR) group.isPTBR = true;

      if (!group.coverUrl && coverUrl) {
        group.coverUrl = coverUrl;
        group.hasCover = true;
      }

      if (isPTBR || region === 'USA') {
        group.displayTitle = baseTitle;
        group.rawPrimaryPath = rawPath;
      }
    }

    if (coverKey && !coverMap.has(coverKey)) {
      coverMap.set(coverKey, group);
      group._coverKeys.push(coverKey);
    }
    if (compKey && titleMap.get(compKey) !== group) {
      titleMap.set(compKey, group);
      group._titleKeys.push(compKey);
    }
  }

  const activeGroups = groups.filter((g) => !g._merged);
  const groupedList = activeGroups.map((g) => {
    const { _titleKeys, _coverKeys, _merged, ...cleanGroup } = g;
    const discsArr = Array.from(cleanGroup.discs);
    const regionsArr = Array.from(cleanGroup.regions);

    const score = computePopularityScore(
      cleanGroup.displayTitle,
      cleanGroup.rawPrimaryPath,
      cleanGroup.versions.length,
      cleanGroup.hasCover,
      cleanGroup.isPTBR
    );

    return {
      ...cleanGroup,
      discsCount: discsArr.length,
      discsLabel: discsArr.length > 1 ? `${discsArr.length} Discos` : '',
      versionsCount: cleanGroup.versions.length,
      versionsLabel: cleanGroup.versions.length > 1 ? `${cleanGroup.versions.length} Versões` : '',
      regionsLabel: regionsArr.join(', '),
      popularityScore: score,
    };
  });

  // Games with covers first, then by popularity descending, then alphabetical
  groupedList.sort((a, b) => {
    const aHas = a.hasCover ? 1 : 0;
    const bHas = b.hasCover ? 1 : 0;
    if (bHas !== aHas) return bHas - aHas;
    if (b.popularityScore !== a.popularityScore) {
      return b.popularityScore - a.popularityScore;
    }
    return a.displayTitle.localeCompare(b.displayTitle, 'pt-BR');
  });

  return groupedList;
}

export function isGroupedCatalogCache(data) {
  return Array.isArray(data) && data.length > 0 && Array.isArray(data[0]?.versions);
}

export function hydrateGroupedCatalog(cachedData, platform) {
  if (!Array.isArray(cachedData) || cachedData.length === 0) return [];
  if (!isGroupedCatalogCache(cachedData)) {
    return processAndGroupEntries(cachedData, platform);
  }
  return cachedData.map((g) => ({
    ...g,
    discs: g.discs instanceof Set ? g.discs : new Set(Array.isArray(g.discs) ? g.discs : []),
    regions: g.regions instanceof Set ? g.regions : new Set(Array.isArray(g.regions) ? g.regions : []),
  }));
}

