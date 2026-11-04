import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import 'fake-indexeddb/auto';
import { filterPlatformsByEntitlements, buildManifestPayload, getPlatformManifest, classifyEntitlementResult, isPlatformEntitled, filterHubPlatforms } from '../services/accessService.js';
import { getCachedCatalog, setCachedCatalog, CACHE_TTL_MS, DB_NAME, LEGACY_DB_NAMES, CACHE_SCHEMA_VERSION, cleanupLegacyDatabases } from '../services/accessCache.js';
import { ALL_PLATFORMS } from '../pages/access/data/platformsData.js';
import { processAndGroupEntries, resolveVersionDownloadLink, sortCatalogGames } from '../pages/access/utils/catalogProcessor.js';
import { getEffectiveProductImage } from '../utils/productImages.js';
import { buildLoginRedirect } from '../utils/auth.js';

test('test_hub_renders_entitled_platforms', () => {
  const userSystems = ['atomiswave', 'ps2'];
  const platforms = filterPlatformsByEntitlements(ALL_PLATFORMS, userSystems);

  assert.equal(platforms.length, 2);
  const ids = platforms.map((p) => p.id);
  assert.ok(ids.includes('atomiswave'));
  assert.ok(ids.includes('ps2'));
  assert.ok(!ids.includes('wii'));
});

test('test_hub_client_filter', () => {
  const userSystems = ['ps2', 'psx', 'wii', 'snes', 'dreamcast', 'mastersystem'];
  const platforms = filterPlatformsByEntitlements(ALL_PLATFORMS, userSystems);

  // Busca por name
  assert.equal(filterHubPlatforms(platforms, 'playstation', 'all').length, 2);
  // Busca por shortName
  assert.equal(filterHubPlatforms(platforms, 'snes', 'all').length, 1);
  // Busca por company
  assert.equal(filterHubPlatforms(platforms, 'nintendo', 'all').length, 2);
  // Busca por company especifica (Sony nao esta no name/shortName/mnemonic de PS1 nem PS2)
  assert.equal(filterHubPlatforms(platforms, 'sony', 'all').length, 2);
  // Busca por mnemonic (psx -> ps1)
  assert.equal(filterHubPlatforms(platforms, 'psx', 'all').length, 1);
  // Filtro por chip de fabricante
  assert.equal(filterHubPlatforms(platforms, '', 'Sony').length, 2);
  assert.equal(filterHubPlatforms(platforms, '', 'Sega').length, 2);
  assert.equal(filterHubPlatforms(platforms, 'wii', 'Sony').length, 0);
  assert.equal(filterHubPlatforms(platforms, 'sony', 'Nintendo').length, 0);
});

test('test_platform_catalog_loads_games', () => {
  const rawEntries = [
    { path: 'atomiswave/Dolphin Blue.zip', name: 'Dolphin Blue', cover2d_url: 'https://img/db.png', size: '150000000', link: 'https://download/db.zip' },
    { path: 'atomiswave/The King of Fighters XI.zip', name: 'KOF XI', cover2d_url: 'https://img/kof.png', size: '300000000', link: 'https://download/kof.zip' },
  ];
  const platform = { id: 'atomiswave', mnemonic: 'atomiswave', name: 'Sammy Atomiswave' };

  const games = processAndGroupEntries(rawEntries, platform);
  assert.equal(games.length, 2);
  const titles = games.map((g) => g.displayTitle);
  assert.ok(titles.includes('Dolphin Blue'));
  assert.ok(titles.includes('The King of Fighters XI'));
  assert.ok(games[0].versions[0].link.startsWith('https://'));
});

test('test_arcade_game_title_and_cover_resolution', () => {
  const rawArcadeEntries = [
    {
      path: 'anmlbskt.zip',
      name: 'Animal Basket',
      cover2d_url: 'https://adb.arcadeitalia.net/?mame=anmlbskt&type=flyer&resize=0',
      genre: 'Sports / Basketball',
      size: '15.88 MiB',
      link: 'https://archive.org/download/atomiswave/anmlbskt.zip'
    },
    {
      path: '1941.zip',
      name: '1941 - Counter Attack (World)',
      cover2d_url: 'https://adb.arcadeitalia.net/?mame=1941&type=flyer&resize=0',
      genre: 'Shooter / Flying Vertical',
      size: '1.35 MiB',
      link: 'https://archive.org/download/cps1/1941.zip'
    }
  ];
  const platform = { id: 'cps1', mnemonic: 'cps1', name: 'Capcom Play System 1' };
  const games = processAndGroupEntries(rawArcadeEntries, platform);

  assert.equal(games.length, 2);
  const game1 = games.find((g) => g.displayTitle.includes('1941'));
  const game2 = games.find((g) => g.displayTitle.includes('Animal Basket'));

  assert.ok(game1, 'Jogo 1941 deve ser encontrado com título humano');
  assert.equal(game1.displayTitle, '1941 - Counter Attack (World)');
  assert.equal(game1.coverUrl, 'https://adb.arcadeitalia.net/?mame=1941&type=flyer&resize=0');
  assert.equal(game1.hasCover, true);

  assert.ok(game2, 'Jogo Animal Basket deve ser encontrado com título humano');
  assert.equal(game2.displayTitle, 'Animal Basket');
  assert.equal(game2.coverUrl, 'https://adb.arcadeitalia.net/?mame=anmlbskt&type=flyer&resize=0');
  assert.equal(game2.hasCover, true);
});

test('test_platform_catalog_unauthorized_guard', () => {
  const userSystems = ['ps2', 'wii', 'psx', 'mame2003Plus'];

  assert.equal(isPlatformEntitled({ id: 'ps2', mnemonic: 'ps2' }, userSystems), true);
  assert.equal(isPlatformEntitled({ id: 'wii', mnemonic: 'wii' }, userSystems), true);
  assert.equal(isPlatformEntitled({ id: 'ps1', mnemonic: 'psx' }, userSystems), true);
  assert.equal(isPlatformEntitled({ id: 'mame2003plus', mnemonic: 'mame2003Plus' }, userSystems), true);
  assert.equal(isPlatformEntitled({ id: 'atomiswave', mnemonic: 'atomiswave' }, userSystems), false);
  assert.equal(isPlatformEntitled({ id: 'ps3', mnemonic: 'ps3' }, userSystems), false);
  assert.equal(isPlatformEntitled({ id: 'ps3', mnemonic: 'ps3' }, ['all']), true);
  assert.equal(isPlatformEntitled({ id: 'ps3', mnemonic: 'ps3' }, ['*']), true);
});

test('test_game_detail_modal_direct_download', () => {
  const rawEntries = [
    {
      path: 'ps2/Resident Evil 4 (Brasil) (Dublado).iso',
      size: '4500000000',
      link: 'https://cdn.digitalstoregames.com/roms/ps2/re4_ptbr.iso',
      cover2d_url: 'https://cdn/re4.png',
      genre: 'Survival Horror'
    },
    {
      path: 'ps2/Resident Evil 4 (USA).iso',
      size: '4400000000',
      link: 'https://cdn.digitalstoregames.com/roms/ps2/re4_usa.iso',
      cover2d_url: 'https://cdn/re4.png',
      genre: 'Survival Horror'
    }
  ];
  const platform = { id: 'ps2', mnemonic: 'ps2', name: 'PlayStation 2' };
  const grouped = processAndGroupEntries(rawEntries, platform);
  const game = grouped[0];

  assert.equal(game.displayTitle, 'Resident Evil 4');
  assert.equal(game.isPTBR, true);
  assert.equal(resolveVersionDownloadLink(game.versions, 0), 'https://cdn.digitalstoregames.com/roms/ps2/re4_ptbr.iso');
  assert.equal(resolveVersionDownloadLink(game.versions, 1), 'https://cdn.digitalstoregames.com/roms/ps2/re4_usa.iso');
  assert.equal(resolveVersionDownloadLink([{ link: 'https://cdn/v1.iso' }, { link: '' }], 1), 'https://cdn/v1.iso');
  assert.equal(resolveVersionDownloadLink([], 0), '#');
  assert.ok(game.bestSizeFormatted.includes('GB'));
});

test('test_indexeddb_catalog_cache', async () => {
  const platformId = 'atomiswave';
  const testData = [{ id: 'test_game', displayTitle: 'Test Game', versions: [] }];

  const prevWindow = globalThis.window;
  const realDateNow = Date.now;
  let fakeNow = 1_700_000_000_000;

  // Usa fake-indexeddb nativo para exercitar transações, upgrade e structured clone reais
  globalThis.window = { indexedDB: globalThis.indexedDB };
  Date.now = () => fakeNow;

  try {
    // 1. Cria um banco legado prévio para testar a remoção na inicialização
    await new Promise((resolve, reject) => {
      const openReq = indexedDB.open('DSG_Access_Catalog_v1', 1);
      openReq.onsuccess = () => {
        openReq.result.close();
        resolve();
      };
      openReq.onerror = () => reject(openReq.error);
    });

    const dbsBefore = await indexedDB.databases();
    assert.equal(dbsBefore.some((db) => db.name === 'DSG_Access_Catalog_v1'), true, 'Banco legado deve existir antes da inicializacao');

    // 2. Grava no cache IndexedDB real (openDatabase() deve invocar cleanupLegacyDatabases)
    await setCachedCatalog(platformId, testData);

    // 3. Valida se o banco legado foi deletado
    const dbsAfter = await indexedDB.databases();
    assert.equal(dbsAfter.some((db) => db.name === 'DSG_Access_Catalog_v1'), false, 'Banco legado DSG_Access_Catalog_v1 deve ser removido');
    assert.equal(dbsAfter.some((db) => db.name === DB_NAME), true, 'Novo banco DSG_Access_Catalog_v2 deve existir');

    // Valida comportamento defensivo de cleanupLegacyDatabases
    assert.deepEqual(cleanupLegacyDatabases(null), []);
    assert.deepEqual(cleanupLegacyDatabases({}), []);

    // 4. Confirma que a store real 'catalogs' existe e armazena os dados com schemaVersion: 2
    const readDb = await new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    assert.equal(readDb.objectStoreNames.contains('catalogs'), true, 'Store catalogs deve existir');

    const storedRecord = await new Promise((resolve, reject) => {
      const tx = readDb.transaction('catalogs', 'readonly');
      const store = tx.objectStore('catalogs');
      const req = store.get(platformId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    readDb.close();

    assert.ok(storedRecord, 'Registro deve existir no IndexedDB');
    assert.equal(storedRecord.schemaVersion, CACHE_SCHEMA_VERSION);
    assert.deepEqual(storedRecord.data, testData);

    // 5. Dentro de 24h exatas (24 * 60 * 60 * 1000 - 1000 ms) -> retorna os dados válidos
    fakeNow += 24 * 60 * 60 * 1000 - 1000;
    const cachedValid = await getCachedCatalog(platformId);
    assert.deepEqual(cachedValid, testData);

    // 6. Registro com schemaVersion antigo ou corrompido deve ser ignorado
    const writeOldDb = await new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise((resolve, reject) => {
      const tx = writeOldDb.transaction('catalogs', 'readwrite');
      const store = tx.objectStore('catalogs');
      const req = store.put({ id: 'legacy_plat', data: testData, timestamp: fakeNow, schemaVersion: 1 });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    writeOldDb.close();
    assert.equal(await getCachedCatalog('legacy_plat'), null, 'Registro com schemaVersion != 2 deve ser descartado');

    // 7. Após 24h exatas -> expira e retorna null
    fakeNow += 2000;
    const cachedExpired = await getCachedCatalog(platformId);
    assert.equal(cachedExpired, null, 'Cache com mais de 24h deve expirar e retornar null');
  } finally {
    Date.now = realDateNow;
    globalThis.window = prevWindow;
  }
});

test('test_unauthenticated_redirect', () => {
  // 1. Sem localização -> fallback /login
  assert.equal(buildLoginRedirect(null), '/login');
  assert.equal(buildLoginRedirect(undefined), '/login');

  // 2. Já em /login -> não duplica
  assert.equal(buildLoginRedirect({ pathname: '/login' }), '/login');

  // 3. /area-cliente ou /selecionar-loja -> login com preservação de query params (store_id)
  assert.equal(
    buildLoginRedirect({ pathname: '/area-cliente', search: '?store_id=20000' }),
    '/login?store_id=20000'
  );
  assert.equal(
    buildLoginRedirect({ pathname: '/selecionar-loja', search: '?store_id=30000' }),
    '/login?store_id=30000'
  );

  // 4. Rota profunda do catálogo com search
  assert.equal(
    buildLoginRedirect({ pathname: '/acesso/ps2', search: '?store_id=20000' }),
    '/login?store_id=20000&redirect=%2Facesso%2Fps2'
  );
  assert.equal(
    buildLoginRedirect({ pathname: '/acesso/ps2', search: '?storeid=20000' }),
    '/login?storeid=20000&redirect=%2Facesso%2Fps2'
  );
  assert.equal(
    buildLoginRedirect({ pathname: '/acesso/ps2', search: '?redirect=%2Fcustom_target' }),
    '/login?redirect=%2Fcustom_target'
  );
  assert.equal(
    buildLoginRedirect({ pathname: '/acesso/ps2', search: '?return_to=%2Fcustom_target' }),
    '/login?return_to=%2Fcustom_target'
  );

  // 5. Hub do acesso
  assert.equal(
    buildLoginRedirect({ pathname: '/acesso', search: '' }),
    '/login?redirect=%2Facesso'
  );

  // 6. Rota com caracteres especiais / espaços
  assert.equal(
    buildLoginRedirect({ pathname: '/acesso/ps2/jogo especial', search: '?tab=1' }),
    '/login?tab=1&redirect=%2Facesso%2Fps2%2Fjogo+especial%3Ftab%3D1'
  );
});

test('test_effective_product_image_fallbacks', () => {
  // Existing image should be preserved if not blank
  assert.equal(getEffectiveProductImage('Sega Saturn', 'https://custom.com/saturn.jpg'), 'https://custom.com/saturn.jpg');
  // Blank or null image should fallback based on title
  assert.equal(getEffectiveProductImage('Sega Saturn', null), 'https://emulators.digitalstoregames.com/52emul/checkout2/images/saturnbox.webp');
  assert.equal(getEffectiveProductImage('Sega Saturn', ''), 'https://emulators.digitalstoregames.com/52emul/checkout2/images/saturnbox.webp');
  assert.equal(getEffectiveProductImage('Nintendo Switch Colecao', ''), 'https://emulators.digitalstoregames.com/52emul/checkout2/images/switchbox.webp');
  assert.equal(getEffectiveProductImage('Xbox 360 Completo', null), 'https://emulators.digitalstoregames.com/52emul/checkout2/images/xbox360.webp');
  assert.equal(getEffectiveProductImage('Xbox Classico', null), 'https://emulators.digitalstoregames.com/52emul/checkout2/images/xboxclassicbox.webp');
  assert.equal(getEffectiveProductImage('PlayStation 2 Completo', null), 'https://emulators.digitalstoregames.com/ps2/checkout2/images/ps1ps3psp.webp');
  assert.equal(getEffectiveProductImage('Super Nintendo SNES', null), 'https://emulators.digitalstoregames.com/ps2/checkout2/images/nintendocollection.webp');
  assert.equal(getEffectiveProductImage('Pacote Desconhecido', null), 'https://emulators.digitalstoregames.com/images/multigames.png');
});

test('test_back_button_conditional_visibility_from_hub', () => {
  // Simula a verificacao de exibicao condicional do botao voltar
  const shouldRenderBackButton = (locationState) => Boolean(locationState?.fromHub);

  // Navegacao direta (URL digitada, bookmark, sem state) -> NAO deve exibir
  assert.equal(shouldRenderBackButton(null), false);
  assert.equal(shouldRenderBackButton(undefined), false);
  assert.equal(shouldRenderBackButton({}), false);
  assert.equal(shouldRenderBackButton({ fromHub: false }), false);

  // Navegacao a partir da tela principal (AcessoHub com state fromHub: true) -> DEVE exibir
  assert.equal(shouldRenderBackButton({ fromHub: true }), true);
});

test('test_t5_contract_manifest_payload_and_cache_db_name', async () => {
  const payload = buildManifestPayload('cps2');
  assert.deepEqual(payload, { mnemonicos: [{ name: 'cps2' }] });
  assert.equal('infos' in payload.mnemonicos[0], false, 'Payload do manifesto nao deve restringir infos');
  assert.equal(DB_NAME, 'DSG_Access_Catalog_v2');

  // Trava que getPlatformManifest realmente envia o payload sem infos via axios.post
  const originalPost = axios.post;
  let sentPayload = null;
  axios.post = async (url, data) => {
    sentPayload = data;
    return { data: { entries: [{ path: 'cps2/test.zip' }] } };
  };
  try {
    await getPlatformManifest('cps2');
    assert.deepEqual(sentPayload, { mnemonicos: [{ name: 'cps2' }] });
    assert.equal('infos' in sentPayload.mnemonicos[0], false, 'getPlatformManifest nao pode conter infos no payload');
  } finally {
    axios.post = originalPost;
  }

  const ordered = processAndGroupEntries([
    { path: 'cps2/no_cover.zip', name: 'Alpha No Cover', link: 'https://dl/1' },
    { path: 'cps2/with_cover.zip', name: 'Zeta With Cover', cover2d_url: 'https://img/zeta.png', link: 'https://dl/2' },
  ], { id: 'cps2', mnemonic: 'cps2' });
  assert.equal(ordered[0].displayTitle, 'Zeta With Cover', 'Jogos com capa devem vir primeiro');
  assert.equal(ordered[1].displayTitle, 'Alpha No Cover', 'Jogos sem capa devem ficar por ultimo');

  // Proteção da regra "com capa primeiro": mesmo que sem capa tenha score astronômico
  const testSort = [
    { displayTitle: 'Sem Capa Famoso', hasCover: false, popularityScore: 99999 },
    { displayTitle: 'Com Capa Menos Famoso', hasCover: true, popularityScore: 1 },
  ];
  const sortedPop = sortCatalogGames(testSort, 'popular');
  assert.equal(sortedPop[0].displayTitle, 'Com Capa Menos Famoso', 'Com capa deve vir antes no modo popular');
  const sortedAlpha = sortCatalogGames(testSort, 'alpha');
  assert.equal(sortedAlpha[0].displayTitle, 'Com Capa Menos Famoso', 'Com capa deve vir antes no modo alfabético');

  // Trava que processAndGroupEntries não contorna sortCatalogGames com sort apenas por popularityScore:
  // Um Master Hit sem capa (score > 700) deve rigorosamente vir DEPOIS de um jogo obscuro com capa (score ~60)
  const popVsCover = processAndGroupEntries([
    { path: 'ps2/gta.iso', name: 'Grand Theft Auto San Andreas', link: 'https://dl/gta' },
    { path: 'ps2/obscure.iso', name: 'Obscure Indisputable Title', cover2d_url: 'https://img/obs.png', link: 'https://dl/obs' },
  ], { id: 'ps2', mnemonic: 'ps2' });
  assert.equal(popVsCover[0].displayTitle, 'Obscure Indisputable Title', 'Item com capa deve preceder item sem capa');
  assert.equal(popVsCover[1].displayTitle, 'Grand Theft Auto San Andreas', 'Item sem capa fica por último mesmo sendo Master Hit de altíssima popularidade');
});

test('test_classify_entitlement_result_distinguishes_denied_error_and_login', () => {
  const ps2 = { id: 'ps2', mnemonic: 'ps2' };
  assert.equal(
    classifyEntitlementResult({ data: { success: true, systems: ['ps2'] }, platform: ps2 }),
    'authorized'
  );
  assert.equal(
    classifyEntitlementResult({ data: { success: true, systems: ['wii'] }, platform: ps2 }),
    'denied'
  );
  assert.equal(
    classifyEntitlementResult({ data: { success: false, systems: [] }, platform: ps2 }),
    'error'
  );
  assert.equal(
    classifyEntitlementResult({ error: new Error('Network Error'), platform: ps2 }),
    'error'
  );
  assert.equal(
    classifyEntitlementResult({ error: { response: { status: 401 } }, platform: ps2 }),
    'login'
  );
});
