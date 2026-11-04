import test from 'node:test';
import assert from 'node:assert/strict';
import { filterPlatformsByEntitlements, buildManifestPayload, classifyEntitlementResult, isPlatformEntitled, filterHubPlatforms } from '../services/accessService.js';
import { getCachedCatalog, setCachedCatalog, CACHE_TTL_MS, DB_NAME } from '../services/accessCache.js';
import { ALL_PLATFORMS } from '../pages/access/data/platformsData.js';
import { processAndGroupEntries } from '../pages/access/utils/catalogProcessor.js';
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
  const userSystems = ['ps2', 'psx', 'wii', 'snes'];
  const platforms = filterPlatformsByEntitlements(ALL_PLATFORMS, userSystems);

  // Busca por name
  assert.equal(filterHubPlatforms(platforms, 'playstation', 'all').length, 2);
  // Busca por shortName
  assert.equal(filterHubPlatforms(platforms, 'snes', 'all').length, 1);
  // Busca por company
  assert.equal(filterHubPlatforms(platforms, 'nintendo', 'all').length, 2);
  // Busca por mnemonic (psx -> ps1)
  assert.equal(filterHubPlatforms(platforms, 'psx', 'all').length, 1);
  // Filtro por chip de fabricante
  assert.equal(filterHubPlatforms(platforms, '', 'Sony').length, 2);
  assert.equal(filterHubPlatforms(platforms, 'wii', 'Sony').length, 0);
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
    }
  ];
  const platform = { id: 'ps2', mnemonic: 'ps2', name: 'PlayStation 2' };
  const grouped = processAndGroupEntries(rawEntries, platform);
  const game = grouped[0];

  assert.equal(game.displayTitle, 'Resident Evil 4');
  assert.equal(game.isPTBR, true);
  assert.equal(game.versions[0].link, 'https://cdn.digitalstoregames.com/roms/ps2/re4_ptbr.iso');
  assert.ok(game.bestSizeFormatted.includes('GB'));
});

test('test_indexeddb_catalog_cache', async () => {
  const platformId = 'atomiswave';
  const testData = [{ id: 'test_game', displayTitle: 'Test Game' }];

  await setCachedCatalog(platformId, testData);
  const cached = await getCachedCatalog(platformId);

  assert.deepEqual(cached, testData);
});

test('test_unauthenticated_redirect', () => {
  assert.equal(
    buildLoginRedirect({ pathname: '/acesso/ps2', search: '?store_id=20000' }),
    '/login?store_id=20000&redirect=%2Facesso%2Fps2'
  );
  assert.equal(
    buildLoginRedirect({ pathname: '/acesso', search: '' }),
    '/login?redirect=%2Facesso'
  );
  assert.equal(
    buildLoginRedirect({ pathname: '/area-cliente', search: '?store_id=20000' }),
    '/login?store_id=20000'
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

test('test_t5_contract_manifest_payload_and_cache_db_name', () => {
  const payload = buildManifestPayload('cps2');
  assert.deepEqual(payload, { mnemonicos: [{ name: 'cps2' }] });
  assert.equal('infos' in payload.mnemonicos[0], false, 'Payload do manifesto nao deve restringir infos');
  assert.equal(DB_NAME, 'DSG_Access_Catalog_v2');

  const ordered = processAndGroupEntries([
    { path: 'cps2/no_cover.zip', name: 'Alpha No Cover', link: 'https://dl/1' },
    { path: 'cps2/with_cover.zip', name: 'Zeta With Cover', cover2d_url: 'https://img/zeta.png', link: 'https://dl/2' },
  ], { id: 'cps2', mnemonic: 'cps2' });
  assert.equal(ordered[0].displayTitle, 'Zeta With Cover', 'Jogos com capa devem vir primeiro');
  assert.equal(ordered[1].displayTitle, 'Alpha No Cover', 'Jogos sem capa devem ficar por ultimo');
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
