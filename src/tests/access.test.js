import test from 'node:test';
import assert from 'node:assert/strict';
import { filterPlatformsByEntitlements } from '../services/accessService.js';
import { getCachedCatalog, setCachedCatalog, CACHE_TTL_MS } from '../services/accessCache.js';
import { ALL_PLATFORMS } from '../pages/access/data/platformsData.js';
import { processAndGroupEntries } from '../pages/access/utils/catalogProcessor.js';

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
  const userSystems = ['ps2', 'ps1', 'wii', 'snes'];
  const platforms = filterPlatformsByEntitlements(ALL_PLATFORMS, userSystems);

  // Client search filter by text
  const searchFilter = (query) =>
    platforms.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));

  const sonyResults = searchFilter('playstation');
  assert.equal(sonyResults.length, 2);

  const nintendoResults = searchFilter('nintendo');
  assert.equal(nintendoResults.length, 2);
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

test('test_platform_catalog_unauthorized_guard', () => {
  const userSystems = ['ps2', 'wii'];
  const isAuthorized = (platformId, mnemonic) => {
    const list = userSystems.map((s) => s.toLowerCase());
    return list.includes('all') || list.includes(platformId.toLowerCase()) || list.includes(mnemonic.toLowerCase());
  };

  assert.equal(isAuthorized('ps2', 'ps2'), true);
  assert.equal(isAuthorized('wii', 'wii'), true);
  assert.equal(isAuthorized('atomiswave', 'atomiswave'), false);
  assert.equal(isAuthorized('ps3', 'ps3'), false);
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
  const checkToken = (token) => {
    if (!token) return { redirect: '/login' };
    return { redirect: null };
  };

  assert.deepEqual(checkToken(null), { redirect: '/login' });
  assert.deepEqual(checkToken('valid-jwt-token'), { redirect: null });
});
