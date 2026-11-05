import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { filterPlatformsByEntitlements, getUserEntitledSystems } from '../services/accessService.js';
import api from '../services/api.js';
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


// [T3] getUserEntitledSystems repassa message/error do backend no ramo de falha,
// que as telas levam a telemetria (logApiError).

test('getUserEntitledSystems - success:false repassa message do backend', async (t) => {
  const m = mock.method(api, 'get', async () => ({ data: { success: false, message: 'X' } }));
  t.after(() => m.mock.restore());
  const r = await getUserEntitledSystems();
  assert.equal(r.success, false);
  assert.deepEqual(r.systems, []);
  assert.equal(r.message, 'X');
});

test('getUserEntitledSystems - success:false repassa error do backend', async (t) => {
  const m = mock.method(api, 'get', async () => ({ data: { success: false, error: 'Y' } }));
  t.after(() => m.mock.restore());
  const r = await getUserEntitledSystems();
  assert.equal(r.success, false);
  assert.equal(r.error, 'Y');
});

test('getUserEntitledSystems - corpo nulo ou nao-objeto nao quebra', async (t) => {
  for (const data of [null, 'texto', undefined]) {
    const m = mock.method(api, 'get', async () => ({ data }));
    const r = await getUserEntitledSystems();
    m.mock.restore();
    assert.equal(r.success, false);
    assert.deepEqual(r.systems, []);
    assert.equal(r.message, undefined);
    assert.equal(r.error, undefined);
  }
});
