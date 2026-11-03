import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getBaseTitle,
  getComparisonKey,
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
