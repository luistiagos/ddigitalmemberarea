// [T4] Testes que RENDERIZAM PlatformCatalog e AcessoHub (jsdom + testing-library,
// .jsx carregado pelo loader de src/tests/setup). Provam a ligacao no componente que os
// testes de funcao pura nao alcancam: tela de erro x "Acesso Restrito", retry que refaz a
// verificacao, 401 -> login com caminho de retorno, e telemetria com a mensagem do backend.
// docs/modules/area-membros/bugs/2026-11-03-falha-na-consulta-de-direitos-vira-acesso-restrito-no-catalogo.md
import './setup/dom.js';
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import api from '../services/api.js';
import { PlatformCatalog } from '../pages/access/PlatformCatalog.jsx';
import { AcessoHub } from '../pages/access/AcessoHub.jsx';

const CATALOG = '/acesso/ps2';
const HUB = '/acesso';

function httpError(status) {
  const err = new Error(`Request failed with status code ${status}`);
  err.response = { status, data: { error: 'x', message: 'y' } };
  return err;
}

let loginLocation = null;
function LoginProbe() {
  const loc = useLocation();
  loginLocation = `${loc.pathname}${loc.search}`;
  return h('div', null, 'TELA DE LOGIN');
}

function renderAt(path) {
  return render(
    h(MemoryRouter, { initialEntries: [path] },
      h(Routes, null,
        h(Route, { path: '/acesso', element: h(AcessoHub) }),
        h(Route, { path: '/acesso/:platformId', element: h(PlatformCatalog) }),
        h(Route, { path: '/login', element: h(LoginProbe) }),
      ),
    ),
  );
}

// Telemetria: logError faz fetch(`/logErr?...message=...`). Captura as mensagens enviadas.
let telemetry = [];
function installFetchSpy() {
  telemetry = [];
  return mock.method(globalThis, 'fetch', async (url) => {
    const u = new URL(String(url));
    if (u.pathname.endsWith('/logErr')) {
      telemetry.push({ method: u.searchParams.get('method'), message: u.searchParams.get('message') });
    }
    return { ok: true };
  });
}

function setup(t, getImpl) {
  localStorage.setItem('authToken', 'tok');
  localStorage.setItem('userEmail', 'cliente@example.com');
  loginLocation = null;
  const get = mock.method(api, 'get', getImpl);
  const f = installFetchSpy();
  const quiet = mock.method(console, 'error', () => {}); // as telas logam o erro esperado
  t.after(() => {
    cleanup();
    get.mock.restore();
    f.mock.restore();
    quiet.mock.restore();
    localStorage.clear();
  });
  return get;
}

for (const [name, path] of [['catalogo', CATALOG], ['Hub', HUB]]) {
  test(`${name}: 500 mostra erro com "Tentar Novamente", nunca "Acesso Restrito", e vai a telemetria`, async (t) => {
    setup(t, async () => { throw httpError(500); });
    renderAt(path);
    await screen.findByText('Tentar Novamente');
    assert.equal(screen.queryByText('Acesso Restrito'), null);
    await waitFor(() => assert.equal(telemetry.length, 1));
    assert.match(telemetry[0].message, /^\[HTTP 500\] Request failed with status code 500/);
  });

  test(`${name}: falha de rede mostra erro com "Tentar Novamente" e vai a telemetria`, async (t) => {
    setup(t, async () => { throw new Error('Network Error'); });
    renderAt(path);
    await screen.findByText('Tentar Novamente');
    assert.equal(screen.queryByText('Acesso Restrito'), null);
    await waitFor(() => assert.equal(telemetry.length, 1));
    assert.match(telemetry[0].message, /^\[HTTP no_response\] Network Error/);
  });

  test(`${name}: 200 success:false mostra erro e leva a mensagem do backend a telemetria`, async (t) => {
    setup(t, async () => ({ data: { success: false, message: 'Assinatura cancelada' } }));
    renderAt(path);
    await screen.findByText('Tentar Novamente');
    assert.equal(screen.queryByText('Acesso Restrito'), null);
    await waitFor(() => assert.equal(telemetry.length, 1));
    assert.match(telemetry[0].message, /Falha na consulta de direitos \(Assinatura cancelada\)/);
  });

  test(`${name}: 401 limpa a sessao e vai ao login com o caminho de retorno, sem telemetria`, async (t) => {
    setup(t, async () => { throw httpError(401); });
    renderAt(path);
    await screen.findByText('TELA DE LOGIN');
    assert.equal(loginLocation, `/login?redirect=${encodeURIComponent(path)}`);
    assert.equal(localStorage.getItem('authToken'), null);
    assert.equal(telemetry.length, 0);
  });
}

test('catalogo: "Tentar Novamente" refaz a consulta de direitos', async (t) => {
  const get = setup(t, async () => { throw httpError(500); });
  renderAt(CATALOG);
  fireEvent.click(await screen.findByText('Tentar Novamente'));
  await waitFor(() => assert.equal(get.mock.callCount(), 2));
  assert.ok(get.mock.calls.every((c) => c.arguments[0] === '/api/app/user/systems'));
  await screen.findByText('Tentar Novamente');
});

test('Hub: "Tentar Novamente" refaz a consulta e mostra os sistemas liberados', async (t) => {
  let n = 0;
  const get = setup(t, async () => {
    n += 1;
    if (n === 1) throw httpError(500);
    return { data: { success: true, systems: ['ps2', 'atomiswave'] } };
  });
  renderAt(HUB);
  fireEvent.click(await screen.findByText('Tentar Novamente'));
  await screen.findByText(/2 sistemas liberados/);
  assert.equal(get.mock.callCount(), 2);
});

test('catalogo: sucesso sem o sistema mostra "Acesso Restrito" e nao vai a telemetria', async (t) => {
  setup(t, async () => ({ data: { success: true, systems: ['atomiswave'] } }));
  renderAt(CATALOG);
  await screen.findByText('Acesso Restrito');
  assert.equal(screen.queryByText('Tentar Novamente'), null);
  assert.equal(telemetry.length, 0);
});
