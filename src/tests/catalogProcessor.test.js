import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getBaseTitle,
  getComparisonKey,
  isCompatibleForCoverMerge,
  processAndGroupEntries,
  isGroupedCatalogCache,
  hydrateGroupedCatalog,
  computePopularityScore,
  extractReleaseRegions,
} from '../pages/access/utils/catalogProcessor.js';

test('getBaseTitle - strips file extension and tags', () => {
  const raw = 'atomiswave/Dolphin Blue (USA) [Rev 1].zip';
  const title = getBaseTitle(raw);
  assert.equal(title, 'Dolphin Blue');
});

test('getComparisonKey - standardizes roman numerals and words', () => {
  assert.equal(getComparisonKey(getBaseTitle('Grand Theft Auto: San Andreas (USA)')), 'grandtheftautosanandreas');
  assert.equal(getComparisonKey('Final Fantasy X'), 'finalfantasy10');
});

test('computePopularityScore - boosts master hits and PT-BR', () => {
  const gtaScore = computePopularityScore('Grand Theft Auto San Andreas', 'gta_sa.iso', 1, true, true);
  const genericScore = computePopularityScore('Obscure Game', 'obscure.iso', 1, false, false);

  assert.ok(gtaScore > genericScore);
});

test('processAndGroupEntries - deduplicates and groups multi-disc entries', () => {
  const rawEntries = [
    { path: 'ps1/Final Fantasy VII (Disc 1).chd', size: '500000000', link: 'http://ff7-1.chd', cover2d_url: 'http://ff7.png' },
    { path: 'ps1/Final Fantasy VII (Disc 2).chd', size: '500000000', link: 'http://ff7-2.chd', cover2d_url: 'http://ff7.png' },
    { path: 'ps1/Final Fantasy VII (Disc 3).chd', size: '500000000', link: 'http://ff7-3.chd', cover2d_url: 'http://ff7.png' },
  ];
  const platform = { id: 'ps1', mnemonic: 'ps1', name: 'PlayStation' };
  const grouped = processAndGroupEntries(rawEntries, platform);

  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].displayTitle, 'Final Fantasy VII');
  assert.equal(grouped[0].versions.length, 3);
  assert.equal(grouped[0].discsCount, 3);
  assert.equal(grouped[0].discsLabel, '3 Discos');
});

test('processAndGroupEntries - does not merge distinct games sharing the same coverUrl', () => {
  const sharedSnesCover = 'https://cdn.digitalstoregames.com/covers/snes/street_fighter_alpha_2.png';
  const snesEntries = [
    { path: 'snes/Street Fighter Alpha 2 (USA).sfc', size: '4194304', link: 'https://dl/sfa2.sfc', cover2d_url: sharedSnesCover },
    { path: 'snes/Street Fighter 2 (USA).sfc', size: '2097152', link: 'https://dl/sf2.sfc', cover2d_url: sharedSnesCover },
    { path: 'snes/Street Fighter 2 Turbo (USA).sfc', size: '3145728', link: 'https://dl/sf2t.sfc', cover2d_url: sharedSnesCover },
  ];
  const snesGrouped = processAndGroupEntries(snesEntries, { id: 'snes', mnemonic: 'snes' });
  assert.equal(snesGrouped.length, 3, 'Street Fighter 2, 2 Turbo e Alpha 2 devem ficar em 3 grupos separados');

  const sharedGtaCover = 'https://cdn.digitalstoregames.com/covers/ps2/gta_sa.png';
  const gtaEntries = [
    { path: 'ps2/GTA Rio de Janeiro Brasil.iso', size: '4000000000', link: 'https://dl/gtario.iso', cover2d_url: sharedGtaCover },
    { path: 'ps2/GTA Dragon Ball Z.iso', size: '4000000000', link: 'https://dl/gtadbz.iso', cover2d_url: sharedGtaCover },
    { path: 'ps2/GTA Sonic.iso', size: '4000000000', link: 'https://dl/gtasonic.iso', cover2d_url: sharedGtaCover },
  ];
  const gtaGrouped = processAndGroupEntries(gtaEntries, { id: 'ps2', mnemonic: 'ps2' });
  assert.equal(gtaGrouped.length, 3, 'Mods distintos de GTA com a mesma capa devem ficar separados');

  const sharedDbzCover = 'https://cdn.digitalstoregames.com/covers/snes/dbz.png';
  const dbzEntries = [
    { path: 'snes/Dragon Ball Z - Super Butouden.sfc', size: '2000000', link: 'https://dl/dbz1.sfc', cover2d_url: sharedDbzCover },
    { path: 'snes/Dragon Ball Z - Super Butouden 2.sfc', size: '2000000', link: 'https://dl/dbz2.sfc', cover2d_url: sharedDbzCover },
  ];
  const dbzGrouped = processAndGroupEntries(dbzEntries, { id: 'snes', mnemonic: 'snes' });
  assert.equal(dbzGrouped.length, 2, 'Sequencias numeradas nao devem fundir pela capa');
});

test('processAndGroupEntries - merges translation and edition variants sharing the same coverUrl', () => {
  const re2Cover = 'https://cdn.digitalstoregames.com/covers/ps1/re2.png';
  const ps1Entries = [
    { path: 'ps1/Resident Evil 2 (USA).chd', size: '700000000', link: 'https://dl/re2_usa.chd', cover2d_url: re2Cover },
    { path: 'ps1/Resident Evil 2 Dublado e Traduzido PT-BR ISO PS1.chd', size: '710000000', link: 'https://dl/re2_ptbr.chd', cover2d_url: re2Cover },
  ];
  const ps1Grouped = processAndGroupEntries(ps1Entries, { id: 'ps1', mnemonic: 'psx' });
  assert.equal(ps1Grouped.length, 1, 'Resident Evil 2 e sua traducao PT-BR com a mesma capa devem agrupar');
  assert.equal(ps1Grouped[0].versions.length, 2);
  assert.equal(isCompatibleForCoverMerge('Crash Bandicoot 2', 'Crash Bandicoot 2 Cortex Strikes Back'), true);
});

test('hydrateGroupedCatalog - restores pre-grouped cache without re-running grouping and preserves Set fields', () => {
  const rawEntries = [
    { path: 'ps1/Crash Bandicoot 2 (USA).chd', size: '500000000', link: 'https://dl/cb2_usa.chd', cover2d_url: 'https://cdn/cb2.png' },
    { path: 'ps1/Crash Bandicoot 2 - Cortex Strikes Back (Brasil).chd', size: '510000000', link: 'https://dl/cb2_br.chd', cover2d_url: 'https://cdn/cb2.png' },
    { path: 'ps1/Crash Bandicoot 2 (Japan) (Disc 1).chd', size: '490000000', link: 'https://dl/cb2_jp.chd' },
  ];
  const platform = { id: 'ps1', mnemonic: 'psx', name: 'PlayStation' };
  const grouped = processAndGroupEntries(rawEntries, platform);

  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].versions.length, 3);
  assert.equal(isGroupedCatalogCache(grouped), true);
  assert.equal(isGroupedCatalogCache(rawEntries), false);

  // Simula serialização em que Set vira Array ou permanece Set no IndexedDB
  const serialized = grouped.map((g) => ({
    ...g,
    discs: Array.from(g.discs),
    regions: Array.from(g.regions),
  }));
  const hydrated = hydrateGroupedCatalog(serialized, platform);
  assert.equal(hydrated.length, 1);
  assert.equal(hydrated[0].regions.has('Brasil'), true);
  assert.equal(hydrated[0].regions.has('USA'), true);
  assert.equal(hydrated[0].regions.has('Japão'), true);
  assert.equal(hydrated[0].discs.has('Disco 1'), true);
});

test('processAndGroupEntries - nome de arquivo de uma palavra nao vira titulo com regiao (isArcadeStem)', () => {
  const cover = 'https://cdn/covers/ps2/Burnout_Europe.png';
  const ps2 = processAndGroupEntries([
    { path: 'ps2/Burnout.chd', name: 'Burnout (Europe) (En,Fr,De,Es,It)', cover2d_url: cover },
    { path: 'ps2/Burnout (USA).chd', name: 'Burnout (USA)', cover2d_url: cover },
  ], { id: 'ps2', mnemonic: 'ps2' });
  assert.equal(ps2.length, 1, 'Burnout.chd e Burnout (USA).chd sao o mesmo jogo: 1 card');
  assert.equal(ps2[0].displayTitle, 'Burnout');
  assert.equal(ps2[0].versions.length, 2);

  const cps2 = processAndGroupEntries([
    { path: 'cps2/sfa3.zip', name: 'Street Fighter Alpha 3 (Euro 980904)' },
  ], { id: 'cps2', mnemonic: 'cps2' });
  assert.equal(cps2[0].displayTitle, 'Street Fighter Alpha 3 (Euro 980904)', 'ROM de arcade segue usando o name');
});

test('extractReleaseRegions - regiao do nome do arquivo; idioma, demo e beta nao contam', () => {
  assert.deepEqual([...extractReleaseRegions('snes/Breath of Fire (USA).sfc')], ['US']);
  assert.deepEqual([...extractReleaseRegions('ps2/Burnout (Europe) (En,Fr,De,Es,It).chd')], ['EU']);
  assert.deepEqual([...extractReleaseRegions('ps2/Death by Degrees (Japan) (Taikenban).chd')], []);
  assert.deepEqual([...extractReleaseRegions('ps2/Silent Hill 3 Dublado PT-BR.iso')], ['BR']);
  assert.deepEqual([...extractReleaseRegions('ps2/Sem Tag.iso')], []);
});

test('processAndGroupEntries - capa igual: o mesmo jogo com nome regional junta, nomes da mesma regiao separam', () => {
  const group = (entries, id = 'snes') => processAndGroupEntries(entries, { id, mnemonic: id });

  const bof = group([
    { path: 'snes/Breath of Fire (USA).sfc', cover2d_url: 'https://cdn/bof.png' },
    { path: 'snes/Breath of Fire - Ryuu no Senshi (Japan).sfc', cover2d_url: 'https://cdn/bof.png' },
  ]);
  assert.equal(bof.length, 1, 'Breath of Fire US e o titulo japones sao o mesmo jogo');

  const ssw = group([
    { path: 'snes/Super Star Wars (USA).sfc', cover2d_url: 'https://cdn/ssw.png' },
    { path: 'snes/Super Star Wars - Return of the Jedi (USA).sfc', cover2d_url: 'https://cdn/ssw.png' },
  ]);
  assert.equal(ssw.length, 2, 'dois nomes na mesma regiao sao dois jogos');

  const dw = group([
    { path: 'ps2/Dynasty Warriors 4 (USA).chd', cover2d_url: 'https://cdn/dw4.png' },
    { path: 'ps2/Dynasty Warriors 4 - Empires (USA).chd', cover2d_url: 'https://cdn/dw4.png' },
  ], 'ps2');
  assert.equal(dw.length, 2, 'spin-off Empires na mesma regiao fica separado');

  const demo = group([
    { path: 'ps2/Death by Degrees (USA).chd', cover2d_url: 'https://cdn/dbd.png' },
    { path: 'ps2/Death by Degrees - Tekken - Nina Williams (Japan).chd', cover2d_url: 'https://cdn/dbd.png' },
    { path: 'ps2/Death by Degrees (Japan) (Taikenban).chd', cover2d_url: 'https://cdn/dbd.png' },
  ], 'ps2');
  const dbdMain = demo.find((g) => g.versions.some((v) => v.rawPath.includes('Nina Williams')));
  assert.ok(dbdMain.versions.some((v) => v.rawPath === 'ps2/Death by Degrees (USA).chd'),
    'a demo japonesa nao faz o japones parecer sobreposto ao americano');
});

test('processAndGroupEntries - capa compartilhada por varios grupos: a entrada procura em todos', () => {
  const cover = 'https://cdn/ratchet1.png';
  const grouped = processAndGroupEntries([
    { path: 'ps2/Ratchet & Clank (USA).chd', cover2d_url: cover },
    { path: 'ps2/Ratchet & Clank 2 (USA).chd', cover2d_url: cover },
    { path: 'ps2/Ratchet & Clank 2 - Gagaga! Ginga no Commando-ssu (Japan).chd', cover2d_url: cover },
  ], { id: 'ps2', mnemonic: 'ps2' });
  assert.equal(grouped.length, 2, 'Ratchet & Clank 1 e o 2 (com o titulo japones do 2) = 2 cards');
  const r2 = grouped.find((g) => g.versions.some((v) => v.rawPath.includes('Clank 2 (USA)')));
  assert.equal(r2.versions.length, 2, 'o titulo japones do 2 entra no card do 2, nao no do 1');
});

test('processAndGroupEntries - chaves internas nao vazam e grupos absorvidos sao filtrados', () => {
  const sharedCover = 'https://cdn/bof.png';
  const rawEntries = [
    { path: 'snes/Breath of Fire.sfc' }, // sem capa -> cria grupo inicial via compKey
    { path: 'snes/Breath of Fire - Ryuu no Senshi (Japan).sfc', cover2d_url: sharedCover }, // cria grupo com capa e regiao JP
    { path: 'snes/Breath of Fire (USA).sfc', cover2d_url: sharedCover }, // casa com grupo 2 por regiao e absorve grupo 1 por compKey
  ];
  const grouped = processAndGroupEntries(rawEntries, { id: 'snes', mnemonic: 'snes' });
  assert.equal(grouped.length, 1, 'Grupo absorvido deve ser unificado em 1 card');
  assert.equal('_titleKeys' in grouped[0], false, '_titleKeys nao deve vazar');
  assert.equal('_coverKeys' in grouped[0], false, '_coverKeys nao deve vazar');
  assert.equal('_merged' in grouped[0], false, '_merged nao deve vazar');
  assert.equal('_mergedInto' in grouped[0], false, '_mergedInto nao deve vazar');
});

test('isCompatibleForCoverMerge - barreiras de seguranca', () => {
  // MOD_FRANCHISES
  assert.equal(isCompatibleForCoverMerge('Grand Theft Auto', 'Grand Theft Auto San Andreas'), false);
  // FORBIDDEN_VARIANTS
  assert.equal(isCompatibleForCoverMerge('Tekken', 'Tekken Tournament'), false);
  // Prefixo mínimo 6 caracteres
  assert.equal(isCompatibleForCoverMerge('Mario', 'Mario Party'), false);
});
