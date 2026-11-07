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
import { render, screen, cleanup } from '@testing-library/react';
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
