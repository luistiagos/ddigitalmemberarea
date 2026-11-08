// O link pós-compra traz o e-mail da compra. Sessão de OUTRA conta no navegador vai para o
// login desta conta (e-mail preenchido); a mesma conta segue direto, sem pedir senha.
// Caso real: tx 64509 (2026-11-06) caiu na sessão de uma conta de teste "ha..." e o comprador viu
// a própria compra com cadeado ("0 de 6 produtos adquiridos").
// docs/modules/area-membros/bugs/2026-11-06-link-pos-compra-de-quem-ja-tem-senha-abre-a-sessao-de-outra-conta.md
import './setup/dom.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { ProtectedRoute } from '../components/ProtectedRoute.jsx';

// JWT com exp em 2286: isAuthenticated() decodifica o payload localmente.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const TOKEN = `${b64({ alg: 'HS256' })}.${b64({ exp: 9999999999 })}.assinatura`;

let loginLocation = null;
function LoginProbe() {
  const loc = useLocation();
  loginLocation = `${loc.pathname}${loc.search}`;
  return h('div', null, 'TELA DE LOGIN');
}

function sessao(email, storeId) {
  localStorage.setItem('authToken', TOKEN);
  localStorage.setItem('userEmail', email);
  localStorage.setItem('userId', '2703');
  if (storeId != null) localStorage.setItem('storeId', String(storeId));
}

function renderAt(path) {
  loginLocation = null;
  return render(
    h(MemoryRouter, { initialEntries: [path] },
      h(Routes, null,
        h(Route, {
          path: '/area-cliente',
          element: h(ProtectedRoute, null, h('div', null, 'AREA DO CLIENTE')),
        }),
        h(Route, { path: '/login', element: h(LoginProbe) }),
      ),
    ),
  );
}

function limpar(t) {
  t.after(() => {
    cleanup();
    localStorage.clear();
  });
}

test('sessão de outra conta: sai e pede o login da conta da compra, e-mail preenchido', (t) => {
  limpar(t);
  sessao('ha.teste@gmail.com', 600004);
  renderAt('/area-cliente?email=luis%40gmail.com&store_id=600004');

  assert.ok(screen.getByText('TELA DE LOGIN'));
  const q = new URLSearchParams(loginLocation.split('?')[1]);
  assert.equal(q.get('email'), 'luis@gmail.com');
  assert.equal(q.get('store_id'), '600004');
  // A sessão da outra conta foi derrubada (o storeId é preservado de propósito por clearAuth).
  assert.equal(localStorage.getItem('authToken'), null);
  assert.equal(localStorage.getItem('userEmail'), null);
});

test('mesma conta (caixa e espaço diferentes): entra direto, sem pedir senha', (t) => {
  limpar(t);
  sessao('Luis@Gmail.com', 600004);
  renderAt('/area-cliente?email=%20luis%40gmail.com&store_id=600004');

  assert.ok(screen.getByText('AREA DO CLIENTE'));
  assert.equal(localStorage.getItem('authToken'), TOKEN);
});

test('link sem e-mail (formato antigo): comportamento de antes, entra com a sessão', (t) => {
  limpar(t);
  sessao('ha.teste@gmail.com', 600004);
  renderAt('/area-cliente?store_id=600004');

  assert.ok(screen.getByText('AREA DO CLIENTE'));
});

test('sem sessão: login com o e-mail do link', (t) => {
  limpar(t);
  renderAt('/area-cliente?email=luis%40gmail.com&store_id=600004');

  assert.ok(screen.getByText('TELA DE LOGIN'));
  assert.equal(new URLSearchParams(loginLocation.split('?')[1]).get('email'), 'luis@gmail.com');
});

// ---- SetPassword: o mesmo furo, no comprador novo (e no comprador com senha, que o
// `/payment_status` mandava para cá por engano desde abril).
import api from '../services/api.js';
import { mock } from 'node:test';
import { SetPassword } from '../pages/SetPassword.jsx';

function renderSenha(path) {
  loginLocation = null;
  return render(
    h(MemoryRouter, { initialEntries: [path] },
      h(Routes, null,
        h(Route, { path: '/criar-senha', element: h(SetPassword) }),
        h(Route, { path: '/area-cliente', element: h(AreaProbe) }),
        h(Route, { path: '/login', element: h(LoginProbe) }),
      ),
    ),
  );
}

let areaLocation = null;
function AreaProbe() {
  const loc = useLocation();
  areaLocation = `${loc.pathname}${loc.search}`;
  return h('div', null, 'AREA DO CLIENTE');
}

function entrada(t, entry) {
  const get = mock.method(api, 'get', async () => ({ data: { entry } }));
  t.after(() => get.mock.restore());
}

test('criar-senha com sessão de outra conta: derruba a sessão e mostra o formulário', async (t) => {
  limpar(t);
  entrada(t, 'set_password');
  sessao('ha.teste@gmail.com', 600005);
  const { container } = renderSenha('/criar-senha?email=novo%40gmail.com&store_id=600004');

  await waitFor(() => assert.ok(container.querySelector('#password')));
  assert.equal(screen.queryByText('AREA DO CLIENTE'), null);
  assert.equal(localStorage.getItem('authToken'), null);
});

test('criar-senha de quem já tem senha, com sessão de outra conta: vai ao login desta conta', async (t) => {
  limpar(t);
  entrada(t, 'login');
  sessao('ha.teste@gmail.com', 600005);
  renderSenha('/criar-senha?email=luis%40gmail.com&store_id=600004');

  await waitFor(() => assert.ok(screen.getByText('TELA DE LOGIN')));
  const q = new URLSearchParams(loginLocation.split('?')[1]);
  assert.equal(q.get('email'), 'luis@gmail.com');
  assert.equal(q.get('store_id'), '600004');
});

test('criar-senha com sessão da MESMA conta: entra na área, levando a loja do link', async (t) => {
  limpar(t);
  entrada(t, 'set_password');
  sessao('Luis@Gmail.com', 600004);
  renderSenha('/criar-senha?email=luis%40gmail.com&store_id=600004');

  await waitFor(() => assert.ok(screen.getByText('AREA DO CLIENTE')));
  assert.equal(areaLocation, '/area-cliente?store_id=600004');
  assert.equal(localStorage.getItem('authToken'), TOKEN);
});

// ---- ResetPassword: link de redefinição com sessão de outra conta no navegador.
// docs/modules/area-membros/bugs/2026-11-08-redefinir-senha-com-outra-conta-logada-abre-a-area-dela.md
import { ResetPassword } from '../pages/ResetPassword.jsx';

function renderReset(path) {
  loginLocation = null;
  areaLocation = null;
  return render(
    h(MemoryRouter, { initialEntries: [path] },
      h(Routes, null,
        h(Route, { path: '/redefinir-senha', element: h(ResetPassword) }),
        h(Route, { path: '/area-cliente', element: h(AreaProbe) }),
        h(Route, { path: '/login', element: h(LoginProbe) }),
      ),
    ),
  );
}

function mockStoreInfo(t) {
  const get = mock.method(api, 'get', async () => ({ data: {} }));
  t.after(() => get.mock.restore());
}

test('redefinir-senha com sessão de outra conta e email na URL: derruba a sessão na montagem e exibe o formulário', async (t) => {
  limpar(t);
  mockStoreInfo(t);
  sessao('ha.teste@gmail.com', 600005);
  const { container } = renderReset('/redefinir-senha?token=tok123&email=novo%40gmail.com&store_id=600004');

  await waitFor(() => assert.ok(container.querySelector('#password')));
  assert.equal(screen.queryByText('AREA DO CLIENTE'), null);
  assert.equal(localStorage.getItem('authToken'), null);
  assert.equal(localStorage.getItem('userEmail'), null);
});

test('redefinir-senha com sessão de outra conta e link sem email: exibe o formulário e derruba a sessão no submit', async (t) => {
  limpar(t);
  mockStoreInfo(t);
  const post = mock.method(api, 'post', async () => ({ data: { success: true, email: 'novo@gmail.com' } }));
  t.after(() => post.mock.restore());

  sessao('ha.teste@gmail.com', 600005);
  const { container } = renderReset('/redefinir-senha?token=tok123&store_id=600004');

  await waitFor(() => assert.ok(container.querySelector('#password')));
  assert.equal(screen.queryByText('AREA DO CLIENTE'), null);
  // Antes do submit a sessão ainda existe, mas o usuário NÃO foi mandado para a área da outra conta
  assert.equal(localStorage.getItem('authToken'), TOKEN);

  const passInput = container.querySelector('#password');
  const confirmInput = container.querySelector('#confirm');
  fireEvent.change(passInput, { target: { value: 'novasenha123' } });
  fireEvent.change(confirmInput, { target: { value: 'novasenha123' } });

  const form = container.querySelector('form');
  fireEvent.submit(form);

  await waitFor(() => assert.ok(screen.getByText(/Senha redefinida/i)));
  // No submit bem-sucedido, a sessão da outra conta foi derrubada
  assert.equal(localStorage.getItem('authToken'), null);
  assert.equal(localStorage.getItem('userEmail'), null);
});

test('redefinir-senha com sessão da MESMA conta: exibe o formulário e derruba a sessão antiga no submit', async (t) => {
  limpar(t);
  mockStoreInfo(t);
  const post = mock.method(api, 'post', async () => ({ data: { success: true, email: 'luis@gmail.com' } }));
  t.after(() => post.mock.restore());

  sessao('luis@gmail.com', 600004);
  const { container } = renderReset('/redefinir-senha?token=tok123&email=Luis%40gmail.com&store_id=600004');

  await waitFor(() => assert.ok(container.querySelector('#password')));
  assert.equal(screen.queryByText('AREA DO CLIENTE'), null);

  const passInput = container.querySelector('#password');
  const confirmInput = container.querySelector('#confirm');
  fireEvent.change(passInput, { target: { value: 'novasenha123' } });
  fireEvent.change(confirmInput, { target: { value: 'novasenha123' } });

  const form = container.querySelector('form');
  fireEvent.submit(form);

  await waitFor(() => assert.ok(screen.getByText(/Senha redefinida/i)));
  // A sessão antiga foi invalidada para forçar o login com a nova senha
  assert.equal(localStorage.getItem('authToken'), null);
  assert.equal(localStorage.getItem('userEmail'), null);
});

test('redefinir-senha sem token: exibe link inválido', async (t) => {
  limpar(t);
  mockStoreInfo(t);
  renderReset('/redefinir-senha');

  await waitFor(() => assert.ok(screen.getByText('Link inválido')));
  assert.equal(screen.queryByText('AREA DO CLIENTE'), null);
});
