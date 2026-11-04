import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';

// Serviços e Utilitários de Acesso
import {
  filterPlatformsByEntitlements,
  buildManifestPayload,
  classifyEntitlementResult,
  isPlatformEntitled,
  filterHubPlatforms,
} from '../services/accessService.js';

import {
  getCachedCatalog,
  setCachedCatalog,
  DB_NAME,
  LEGACY_DB_NAMES,
  CACHE_SCHEMA_VERSION,
  CACHE_TTL_MS,
  cleanupLegacyDatabases,
} from '../services/accessCache.js';

import {
  processAndGroupEntries,
  processAndGroupEntriesAsync,
  hydrateGroupedCatalog,
  isCompatibleForCoverMerge,
  getCanonicalGameKey,
  getComparisonKey,
  getBaseTitle,
  sortCatalogGames,
  resolveVersionDownloadLink,
} from '../pages/access/utils/catalogProcessor.js';

import { buildLoginRedirect } from '../utils/auth.js';
import { ALL_PLATFORMS } from '../pages/access/data/platformsData.js';

// ============================================================================
// 1. CONTRATO DE MANIFESTOS E ORDENAÇÃO DE CAPAS (Bug 1 & Bug 8)
// ============================================================================
test('E2E - Contrato de Payload e Ordenação com Capa Primeiro', () => {
  // O payload de manifestos NUNCA deve enviar o campo restritivo "infos"
  const payload = buildManifestPayload('ps2');
  assert.deepEqual(payload, { mnemonicos: [{ name: 'ps2' }] });
  assert.equal('infos' in payload.mnemonicos[0], false, 'Payload não pode conter infos');

  // Proteção da ordenação: jogos com capa SEMPRE precedem jogos sem capa
  const games = [
    { displayTitle: 'Game Sem Capa Mas Super Popular', hasCover: false, popularityScore: 999999 },
    { displayTitle: 'Game Com Capa E Pouco Popular', hasCover: true, popularityScore: 1 },
    { displayTitle: 'Game A Com Capa', hasCover: true, popularityScore: 500 },
    { displayTitle: 'Game Z Com Capa', hasCover: true, popularityScore: 500 },
  ];

  const sortedPop = sortCatalogGames(games, 'popular');
  assert.equal(sortedPop[0].hasCover, true);
  assert.equal(sortedPop[1].hasCover, true);
  assert.equal(sortedPop[2].hasCover, true);
  assert.equal(sortedPop[3].hasCover, false, 'Jogo sem capa deve ser o último');
  // Entre os que têm a mesma capa e score, desempata alfabeticamente
  assert.equal(sortedPop[0].displayTitle, 'Game A Com Capa');
  assert.equal(sortedPop[1].displayTitle, 'Game Z Com Capa');

  const sortedAlpha = sortCatalogGames(games, 'alpha');
  assert.equal(sortedAlpha[0].hasCover, true);
  assert.equal(sortedAlpha[1].hasCover, true);
  assert.equal(sortedAlpha[2].hasCover, true);
  assert.equal(sortedAlpha[3].hasCover, false, 'Jogo sem capa deve ser o último mesmo em ordem alfabética');

  // Trava que processAndGroupEntries não contorna sortCatalogGames com sort apenas por popularityScore
  const groupedPopVsCover = processAndGroupEntries([
    { path: 'ps2/gta.iso', name: 'Grand Theft Auto San Andreas', link: 'https://dl/gta' },
    { path: 'ps2/obscure.iso', name: 'Obscure Indisputable Title', cover2d_url: 'https://img/obs.png', link: 'https://dl/obs' },
  ], { id: 'ps2', mnemonic: 'ps2' });
  assert.equal(groupedPopVsCover[0].displayTitle, 'Obscure Indisputable Title', 'Item com capa deve preceder item sem capa');
  assert.equal(groupedPopVsCover[1].displayTitle, 'Grand Theft Auto San Andreas', 'Item sem capa fica por último mesmo sendo Master Hit de alta popularidade');
});

// ============================================================================
// 2. PRESERVAÇÃO DE SESSÃO E REDIRECIONAMENTO DE LOGIN (Bug 2)
// ============================================================================
test('E2E - Fluxo de Redirecionamento de Login sem dupla decodificação', () => {
  // Teste de todos os ramos da função buildLoginRedirect
  assert.equal(buildLoginRedirect(null), '/login');
  assert.equal(buildLoginRedirect(undefined), '/login');
  assert.equal(buildLoginRedirect({ pathname: '/login' }), '/login');
  assert.equal(buildLoginRedirect({ pathname: '/area-cliente' }), '/login');
  assert.equal(buildLoginRedirect({ pathname: '/selecionar-loja' }), '/login');

  const deepUrl = buildLoginRedirect({
    pathname: '/acesso/ps2',
    search: '?store_id=123&filter=action',
  });
  assert.equal(deepUrl, '/login?store_id=123&filter=action&redirect=%2Facesso%2Fps2%3Ffilter%3Daction');

  // Simula o comportamento do Login.jsx lendo o parâmetro 'redirect' via URLSearchParams
  // searchParams.get() já decodifica automaticamente uma vez.
  const urlObj = new URL('https://digitalmemberarea.digitalstoregames.com' + deepUrl);
  const rawRedirect = urlObj.searchParams.get('redirect');
  assert.equal(rawRedirect, '/acesso/ps2?filter=action');

  // Caso com espaço/caracteres especiais: garante que não ocorra double decode que quebre "%"
  const specialUrl = buildLoginRedirect({ pathname: '/acesso/ps2/god of war' });
  const urlObj2 = new URL('https://digitalmemberarea.digitalstoregames.com' + specialUrl);
  const decodedRedirect = urlObj2.searchParams.get('redirect');
  assert.equal(decodedRedirect, '/acesso/ps2/god of war');
});

// ============================================================================
// 3. CLASSIFICAÇÃO DE DIREITOS E TRATAMENTO DE FALHAS (Bug 3)
// ============================================================================
test('E2E - Direitos de Acesso: Distinção estrita entre negado, erro e login', () => {
  const platform = { id: 'ps2', mnemonic: 'ps2' };

  // 1. Usuário com direito -> authorized
  assert.equal(
    classifyEntitlementResult({ data: { success: true, systems: ['ps2', 'snes'] }, platform }),
    'authorized'
  );

  // 2. Usuário com pacote "all" ou "*" -> authorized
  assert.equal(
    classifyEntitlementResult({ data: { success: true, systems: ['all'] }, platform }),
    'authorized'
  );
  assert.equal(
    classifyEntitlementResult({ data: { success: true, systems: ['*'] }, platform }),
    'authorized'
  );

  // 3. Usuário autenticado mas sem compra deste console -> denied (Acesso Restrito)
  assert.equal(
    classifyEntitlementResult({ data: { success: true, systems: ['snes', 'wii'] }, platform }),
    'denied'
  );

  // 4. Token expirado / não autenticado (401) -> login
  assert.equal(
    classifyEntitlementResult({ error: { response: { status: 401 } }, platform }),
    'login'
  );

  // 5. Falha de rede ou 500 -> error (NUNCA vira Acesso Restrito!)
  assert.equal(
    classifyEntitlementResult({ error: new Error('Network Timeout 504'), platform }),
    'error'
  );
  assert.equal(
    classifyEntitlementResult({ error: { response: { status: 500 } }, platform }),
    'error'
  );

  // 6. Resposta 200 com success: false da API de sessão -> error (NUNCA vira Acesso Restrito!)
  assert.equal(
    classifyEntitlementResult({ data: { success: false, message: 'DB busy' }, platform }),
    'error'
  );
});

// ============================================================================
// 4. CICLO DE VIDA DO CACHE INDEXEDDB COM fake-indexeddb (Bug 4 & Bug 7)
// ============================================================================
test('E2E - Ciclo de Vida do Cache IndexedDB (Upgrade, TTL 24h e Limpeza de Órfãos)', async () => {
  const platformId = 'ps2';
  const sampleGrouped = [
    {
      id: 'gta_sa',
      displayTitle: 'Grand Theft Auto: San Andreas',
      hasCover: true,
      versions: [{ link: 'https://cdn/gtasa.iso', region: 'Brasil' }],
      discs: new Set(['Disco 1']),
      regions: new Set(['Brasil', 'USA']),
    },
  ];

  const prevWindow = globalThis.window;
  const realDateNow = Date.now;
  let simulatedTime = 1_700_000_000_000;
  Date.now = () => simulatedTime;
  globalThis.window = { indexedDB: globalThis.indexedDB };

  try {
    // A. Cria banco legado prévio para testar remoção de órfão
    await new Promise((resolve) => {
      const req = indexedDB.open('DSG_Access_Catalog_v1', 1);
      req.onsuccess = () => {
        req.result.close();
        resolve();
      };
    });

    const dbsBeforeE2E = await indexedDB.databases();
    assert.equal(dbsBeforeE2E.some((db) => db.name === 'DSG_Access_Catalog_v1'), true, 'Banco legado deve existir antes da inicializacao');

    // B. Grava catálogo agrupado
    await setCachedCatalog(platformId, sampleGrouped);

    // C. Verifica que banco legado foi limpo na primeira abertura
    const dbsAfterE2E = await indexedDB.databases();
    assert.equal(dbsAfterE2E.some((db) => db.name === 'DSG_Access_Catalog_v1'), false, 'Banco legado DSG_Access_Catalog_v1 deve ser removido pelo cache');
    assert.equal(dbsAfterE2E.some((db) => db.name === DB_NAME), true, 'Novo banco DSG_Access_Catalog_v2 deve existir');

    // D. Leitura imediata com reconstituição de Set via hydrateGroupedCatalog
    const cachedData = await getCachedCatalog(platformId);
    assert.ok(cachedData);
    assert.equal(cachedData.length, 1);
    const hydrated = hydrateGroupedCatalog(cachedData, { id: 'ps2', mnemonic: 'ps2' });
    assert.equal(hydrated[0].displayTitle, 'Grand Theft Auto: San Andreas');
    assert.ok(hydrated[0].discs instanceof Set, 'discs deve ser instância de Set');
    assert.ok(hydrated[0].regions instanceof Set, 'regions deve ser instância de Set');
    assert.equal(hydrated[0].regions.has('Brasil'), true);

    // E. Dentro de 24h exatas (24 * 60 * 60 * 1000 - 1000 ms) -> permanece válido
    simulatedTime += 24 * 60 * 60 * 1000 - 1000;
    const stillValid = await getCachedCatalog(platformId);
    assert.ok(stillValid);

    // F. Passou de 24h -> expira e retorna null
    simulatedTime += 2000;
    const expired = await getCachedCatalog(platformId);
    assert.equal(expired, null, 'Cache expirado deve retornar null');
  } finally {
    Date.now = realDateNow;
    globalThis.window = prevWindow;
  }
});

// ============================================================================
// 5. DEDUPLICAÇÃO E AGRUPAMENTO ESTRITO POR CAPA (Bug 5)
// ============================================================================
test('E2E - Agrupamento por Capa: Separação de Sequências vs Fusão de Traduções/Edições', () => {
  const sharedDbzCover = 'https://cdn/covers/dbz_sparking.png';
  const sharedRushingCover = 'https://cdn/covers/rushing_beat.png';
  const sharedTinyCover = 'https://cdn/covers/tiny_toon.png';
  const sharedRe2Cover = 'https://cdn/covers/re2.png';
  const sharedCrash2Cover = 'https://cdn/covers/crash2.png';

  // 1. Sequências de Dragon Ball Z Sparking NUNCA devem fundir
  const dbzEntries = [
    { path: 'ps2/Dragon Ball Z - Sparking!.iso', cover2d_url: sharedDbzCover },
    { path: 'ps2/Dragon Ball Z - Sparking! Neo.iso', cover2d_url: sharedDbzCover },
    { path: 'ps2/Dragon Ball Z - Sparking! Meteor.iso', cover2d_url: sharedDbzCover },
  ];
  const dbzGroups = processAndGroupEntries(dbzEntries, { id: 'ps2', mnemonic: 'ps2' });
  assert.equal(dbzGroups.length, 3, 'Sparking, Neo e Meteor devem ser 3 cards separados');

  // 2. Sequências de Rushing Beat NUNCA devem fundir
  const rushingEntries = [
    { path: 'snes/Rushing Beat.sfc', cover2d_url: sharedRushingCover },
    { path: 'snes/Rushing Beat Ran - Fukusei Toshi.sfc', cover2d_url: sharedRushingCover },
    { path: 'snes/Rushing Beat Shura.sfc', cover2d_url: sharedRushingCover },
  ];
  const rushingGroups = processAndGroupEntries(rushingEntries, { id: 'snes', mnemonic: 'snes' });
  assert.equal(rushingGroups.length, 3, 'Rushing Beat 1, Ran e Shura devem ser 3 cards separados');

  // 3. Tiny Toon Adventures - Buster Busts Loose! NUNCA deve fundir com Wacky Sports Challenge (jogos
  //    distintos). "Tiny Toon Adventures" sozinho, no acervo real, e o titulo japones do Buster Busts Loose!:
  //    por isso ele nao entra aqui como terceiro jogo.
  const tinyEntries = [
    { path: 'snes/Tiny Toon Adventures - Buster Busts Loose!.sfc', cover2d_url: sharedTinyCover },
    { path: 'snes/Tiny Toon Adventures - Wacky Sports Challenge.sfc', cover2d_url: sharedTinyCover },
  ];
  const tinyGroups = processAndGroupEntries(tinyEntries, { id: 'snes', mnemonic: 'snes' });
  assert.equal(tinyGroups.length, 2, 'Buster Busts Loose! e Wacky Sports Challenge devem ser 2 cards separados');

  // 4. Street Fighter 2 clássico, Turbo e Alpha NUNCA devem fundir
  const sfEntries = [
    { path: 'snes/Street Fighter II - The World Warrior.sfc', cover2d_url: 'https://cdn/sf.png' },
    { path: 'snes/Street Fighter II Turbo.sfc', cover2d_url: 'https://cdn/sf.png' },
    { path: 'snes/Street Fighter Alpha 2.sfc', cover2d_url: 'https://cdn/sf.png' },
  ];
  const sfGroups = processAndGroupEntries(sfEntries, { id: 'snes', mnemonic: 'snes' });
  assert.equal(sfGroups.length, 3, 'Street Fighter II, Turbo e Alpha 2 devem ser 3 cards separados');

  // 5. Mods de GTA NUNCA devem fundir entre si
  const gtaEntries = [
    { path: 'ps2/GTA San Andreas (USA).iso', cover2d_url: 'https://cdn/gta.png' },
    { path: 'ps2/GTA Rio de Janeiro Brasil.iso', cover2d_url: 'https://cdn/gta.png' },
    { path: 'ps2/GTA V Legacy Edition.iso', cover2d_url: 'https://cdn/gta.png' },
  ];
  const gtaGroups = processAndGroupEntries(gtaEntries, { id: 'ps2', mnemonic: 'ps2' });
  assert.equal(gtaGroups.length, 3, 'GTA San Andreas, Rio e V Legacy devem ser 3 cards separados');

  // 6. Traduções e edições legítimas do MESMO jogo DEVEM fundir
  const re2Entries = [
    { path: 'ps1/Resident Evil 2 (USA).chd', cover2d_url: sharedRe2Cover, link: 'https://dl/re2_usa' },
    { path: 'ps1/Resident Evil 2 Dublado e Traduzido PT-BR ISO PS1.chd', cover2d_url: sharedRe2Cover, link: 'https://dl/re2_ptbr' },
  ];
  const re2Groups = processAndGroupEntries(re2Entries, { id: 'ps1', mnemonic: 'psx' });
  assert.equal(re2Groups.length, 1, 'Resident Evil 2 e tradução PT-BR devem fundir num único card');
  assert.equal(re2Groups[0].versions.length, 2);

  // 7. Subtítulo oficial de sequência numerada do MESMO jogo DEVE fundir
  const crash2Entries = [
    { path: 'ps1/Crash Bandicoot 2 (USA).chd', cover2d_url: sharedCrash2Cover },
    { path: 'ps1/Crash Bandicoot 2 - Cortex Strikes Back (Brasil).chd', cover2d_url: sharedCrash2Cover },
  ];
  const crash2Groups = processAndGroupEntries(crash2Entries, { id: 'ps1', mnemonic: 'psx' });
  assert.equal(crash2Groups.length, 1, 'Crash Bandicoot 2 e Cortex Strikes Back são o mesmo jogo e devem fundir');
  assert.equal(crash2Groups[0].versions.length, 2);

  // 8. Algarismo romano vs arábico DEVE fundir
  const turricanEntries = [
    { path: 'snes/Super Turrican 2.sfc', cover2d_url: 'https://cdn/st2.png' },
    { path: 'snes/Super Turrican II.sfc', cover2d_url: 'https://cdn/st2.png' },
  ];
  const turricanGroups = processAndGroupEntries(turricanEntries, { id: 'snes', mnemonic: 'snes' });
  assert.equal(turricanGroups.length, 1, 'Super Turrican 2 e Super Turrican II devem fundir');

  // 9. Multi-disco DEVE agrupar em um único jogo com discsCount
  const ff7Entries = [
    { path: 'ps1/Final Fantasy VII (USA) (Disc 1).chd', link: 'https://dl/ff7_d1' },
    { path: 'ps1/Final Fantasy VII (USA) (Disc 2).chd', link: 'https://dl/ff7_d2' },
    { path: 'ps1/Final Fantasy VII (USA) (Disc 3).chd', link: 'https://dl/ff7_d3' },
  ];
  const ff7Groups = processAndGroupEntries(ff7Entries, { id: 'ps1', mnemonic: 'psx' });
  assert.equal(ff7Groups.length, 1);
  assert.equal(ff7Groups[0].discsCount, 3);
  assert.equal(ff7Groups[0].discsLabel, '3 Discos');
});

// ============================================================================
// 6. AGRUPAMENTO ASSÍNCRONO NÃO-BLOQUEANTE (Bug 6)
// ============================================================================
test('E2E - Agrupamento Assíncrono com Fallback Resiliente', async () => {
  const sampleEntries = [
    { path: 'ps2/God of War (USA).iso', cover2d_url: 'https://cdn/gow.png' },
    { path: 'ps2/God of War (Brasil).iso', cover2d_url: 'https://cdn/gow.png' },
  ];

  // 1. Fallback síncrono padrão quando Worker não está disponível (ex: Node sem mock)
  const result = await processAndGroupEntriesAsync(sampleEntries, { id: 'ps2', mnemonic: 'ps2' });
  assert.equal(result.length, 1);
  assert.equal(result[0].displayTitle, 'God of War');
  assert.equal(result[0].versions.length, 2);

  // 2. Caminho com Web Worker ativo e resposta de sucesso
  class MockWorker {
    constructor(url, options) {
      this.url = url;
      this.options = options;
      this.terminated = false;
      MockWorker.lastInstance = this;
    }
    postMessage(msg) {
      this.lastPostedMessage = msg;
      setImmediate(() => {
        if (this.onmessage) {
          this.onmessage({
            data: {
              id: msg.id,
              success: true,
              grouped: [
                {
                  id: 'ps2_mock_sentinel',
                  displayTitle: 'Mock Worker Game',
                  hasCover: true,
                  popularityScore: 100,
                  versions: [{ path: 'ps2/mock.iso' }],
                  regions: ['USA'],
                  discs: [1],
                }
              ]
            }
          });
        }
      });
    }
    terminate() {
      this.terminated = true;
    }
  }

  globalThis.Worker = MockWorker;
  try {
    const workerResult = await processAndGroupEntriesAsync(sampleEntries, { id: 'ps2', mnemonic: 'ps2' });
    assert.equal(workerResult.length, 1);
    assert.equal(workerResult[0].displayTitle, 'Mock Worker Game', 'Deve hidratar e devolver a resposta emitida pelo Worker');
    assert.ok(workerResult[0].regions instanceof Set, 'Deve hidratar Set de regiões');
    assert.equal(MockWorker.lastInstance.terminated, true, 'Worker deve ser terminado após a resposta');

    // 3. Caminho de erro do Worker (deve fazer fallback transparente para síncrono)
    class FailingMockWorker extends MockWorker {
      postMessage(msg) {
        setImmediate(() => {
          if (this.onerror) this.onerror(new Error('Worker out of memory'));
        });
      }
    }
    globalThis.Worker = FailingMockWorker;
    const fallbackResult = await processAndGroupEntriesAsync(sampleEntries, { id: 'ps2', mnemonic: 'ps2' });
    assert.equal(fallbackResult.length, 1);
    assert.equal(fallbackResult[0].displayTitle, 'God of War', 'Em caso de erro no worker deve usar o fallback síncrono');
  } finally {
    delete globalThis.Worker;
  }
});

test('catalogWorker - processa mensagem e devolve postMessage com agrupamento', async () => {
  let posted = null;
  globalThis.self = {
    postMessage: (data) => { posted = data; }
  };
  await import('../pages/access/utils/catalogWorker.js');

  assert.equal(typeof globalThis.self.onmessage, 'function', 'Worker deve registrar self.onmessage');
  globalThis.self.onmessage({
    data: {
      id: 999,
      entries: [
        { path: 'ps2/Crash (USA).iso', cover2d_url: 'https://cdn/crash.png' },
        { path: 'ps2/Crash (Europe).iso', cover2d_url: 'https://cdn/crash.png' },
      ],
      platform: { id: 'ps2', mnemonic: 'ps2' }
    }
  });

  assert.ok(posted, 'Deve chamar postMessage');
  assert.equal(posted.id, 999);
  assert.equal(posted.success, true);
  assert.equal(posted.grouped.length, 1);
  assert.equal(posted.grouped[0].displayTitle, 'Crash');
  assert.equal(posted.grouped[0].versions.length, 2);

  // Testa captura de erro no worker
  globalThis.self.onmessage({
    data: null
  });
  assert.equal(posted.success, false);
  assert.ok(posted.error);
});

// ============================================================================
// 7. HUB DE SISTEMAS E FILTRO INSTANTÂNEO (EARS-1 & EARS-2)
// ============================================================================
test('E2E - Hub: Filtragem Instantânea por Query e Fabricante sem nova requisição', () => {
  const entitledUserSystems = ['ps2', 'psx', 'snes', 'megadrive', 'mastersystem', 'dreamcast'];
  const platforms = filterPlatformsByEntitlements(ALL_PLATFORMS, entitledUserSystems);

  // Deve conter 6 plataformas liberadas
  assert.equal(platforms.length, 6);

  // Filtro por fabricante Sega
  const segaPlatforms = filterHubPlatforms(platforms, '', 'Sega');
  assert.equal(segaPlatforms.length, 3);
  const segaIds = segaPlatforms.map((p) => p.id);
  assert.ok(segaIds.includes('megadrive'));
  assert.ok(segaIds.includes('mastersystem'));
  assert.ok(segaIds.includes('dreamcast'));

  // Busca textual combinada com fabricante
  const searchSega = filterHubPlatforms(platforms, 'drive', 'Sega');
  assert.equal(searchSega.length, 1);
  assert.equal(searchSega[0].id, 'megadrive');

  // Busca que não bate com o fabricante selecionado retorna vazio
  const mismatch = filterHubPlatforms(platforms, 'playstation', 'Sega');
  assert.equal(mismatch.length, 0);
});
