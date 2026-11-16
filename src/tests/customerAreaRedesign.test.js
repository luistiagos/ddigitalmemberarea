import './setup/dom.js';
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, cleanup } from '@testing-library/react';
import api from '../services/api.js';
import { storeUser, clearAuth } from '../utils/auth.js';
import { Navbar } from '../components/Navbar.jsx';
import {
  formatCurrency,
  roundDiscountedItemPrice,
  calculateComboSummary,
  resolveCatalogCurrency,
} from '../utils/memberAreaPricing.js';

// --- T1: calculo de combo/moeda e atalhos na Navbar ---

test('memberAreaPricing_paridade_de_centavos_e_moeda', () => {
  assert.equal(roundDiscountedItemPrice(29.90, 15), 25.42);
  assert.equal(roundDiscountedItemPrice(19.99, 15), 16.99);
  assert.equal(roundDiscountedItemPrice(29.90, 25), 22.43);
  assert.equal(roundDiscountedItemPrice(19.99, 50), 10.00);

  const partial = calculateComboSummary(
    [{ productid: 1, price: 29.90 }, { productid: 2, price: 19.99 }],
    3,
  );
  assert.equal(partial.discountPct, 15);
  assert.equal(partial.subtotal, 49.89);
  assert.equal(partial.total, 42.41);
  assert.equal(partial.savings, 7.48);

  const full = calculateComboSummary(
    [{ productid: 1, price: 29.90 }, { productid: 2, price: 19.99 }, { productid: 3, price: 15.05 }],
    3,
  );
  assert.equal(full.discountPct, 25);
  assert.equal(full.total, 48.71);

  assert.equal(resolveCatalogCurrency([{ productid: 1, currency: 'USD' }]), 'USD');
  assert.equal(resolveCatalogCurrency([{ productid: 1 }]), 'BRL');
  assert.match(formatCurrency(19.90, 'USD', 'en'), /\$19\.90/);
  assert.match(formatCurrency(30, 'BRL', 'ptbr'), /R\$\s*30,00/);
});

test('navbar_exibe_atalhos_para_acesso_e_ativar', (t) => {
  t.after(() => {
    localStorage.removeItem('storeLogoLabel_600004');
    clearAuth();
    cleanup();
    mock.restoreAll();
  });
  localStorage.setItem('storeLogoLabel_600004', 'Loja Teste');
  storeUser({ id: 10, email: 'gamer@test.com', storeId: 600004 }, 'tok-123');
  mock.method(api, 'get', async () => ({ data: { store: { checkout_logo_label: 'Loja Teste' } } }));

  render(h(MemoryRouter, null, h(Navbar)));

  const links = screen.getAllByRole('link');
  const hrefs = links.map((a) => a.getAttribute('href'));
  assert.ok(hrefs.includes('/acesso'), 'Navbar deve expor link para /acesso');
  assert.ok(hrefs.includes('/ativar'), 'Navbar deve expor link para /ativar');
});
