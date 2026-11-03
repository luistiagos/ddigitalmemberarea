import test from 'node:test';
import assert from 'node:assert/strict';
import { filterPlatformsByEntitlements } from '../services/accessService.js';
import { ALL_PLATFORMS } from '../pages/access/data/platformsData.js';

test('filterPlatformsByEntitlements - returns only entitled platforms', () => {
  const userSystems = ['ps2', 'atomiswave'];
  const filtered = filterPlatformsByEntitlements(ALL_PLATFORMS, userSystems);

  assert.equal(filtered.length, 2);
  const ids = filtered.map((p) => p.id);
  assert.ok(ids.includes('ps2'));
  assert.ok(ids.includes('atomiswave'));
});

test('filterPlatformsByEntitlements - returns all platforms if user has "all"', () => {
  const userSystems = ['all'];
  const filtered = filterPlatformsByEntitlements(ALL_PLATFORMS, userSystems);

  assert.equal(filtered.length, ALL_PLATFORMS.length);
});

test('filterPlatformsByEntitlements - returns empty array if no systems or invalid', () => {
  assert.deepEqual(filterPlatformsByEntitlements(ALL_PLATFORMS, []), []);
  assert.deepEqual(filterPlatformsByEntitlements(null, ['ps2']), []);
});

