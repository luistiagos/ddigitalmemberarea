import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getBaseTitle,
  getComparisonKey,
  isCompatibleForCoverMerge,
  processAndGroupEntries,
  computePopularityScore,
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
