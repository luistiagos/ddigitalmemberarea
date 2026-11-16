import './setup/dom.js';
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, within, cleanup, fireEvent } from '@testing-library/react';
import api from '../services/api.js';
import { storeUser, clearAuth } from '../utils/auth.js';
import { Navbar } from '../components/Navbar.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
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

// --- T2: ProductCard e ProductPreviewModal ---

test('card_unico_adquirido_usa_layout_horizontal_focado_no_deliverlink', (t) => {
  t.after(() => { cleanup(); });
  const owned = {
    productid: 1,
    title: 'Sistema Multigames',
    image: 'https://emulators.digitalstoregames.com/images/multigames.png',
    owned: true,
    deliverlink: 'https://digitalmemberarea.digitalstoregames.com/acesso?token=abc',
  };

  const { container } = render(
    h(MemoryRouter, null, h(ProductCard, { product: owned, lang: 'ptbr', featuredHorizontal: true })),
  );

  const article = container.querySelector('article[data-featured-owned="true"]');
  assert.ok(article, 'Deve renderizar card destaque horizontal');
  assert.ok(container.querySelector('img[data-ambient-backdrop="true"]'), 'Deve aplicar ambient backdrop na capa');

  const links = screen.getAllByRole('link');
  assert.equal(links.length, 1);
  assert.equal(links[0].getAttribute('href'), owned.deliverlink);
  assert.equal(screen.queryByText(/\/acesso|Ativar App/i), null);
});

test('card_nao_adquirido_exibe_moeda_e_cta_sem_cadeado_central', (t) => {
  t.after(() => { cleanup(); });
  const itemUsd = {
    productid: 12,
    title: 'Xbox 360 Pack',
    image: 'https://emulators.digitalstoregames.com/images/xbox360.png',
    owned: false,
    price: 19.90,
    relprice: 39.90,
    currency: 'USD',
    description: 'Mais de 3000 jogos prontos.',
  };

  const { container } = render(
    h(ProductCard, { product: itemUsd, lang: 'en', storeCurrency: 'USD' }),
  );

  // Nao existe cadeado gigante (h-12 w-12) cobrindo a capa nem o termo Pagar/Pay
  assert.equal(container.querySelector('.h-12.w-12'), null);
  assert.equal(screen.queryByRole('button', { name: /\b(Pagar|Pay)\b/i }), null);

  const unlockBtn = screen.getByRole('button', { name: /Unlock — \$19\.90/i });
  assert.ok(unlockBtn);
});

test('clique_no_card_abre_modal_preview_com_descricao_e_idioma', (t) => {
  t.after(() => { cleanup(); });
  const item = {
    productid: 22,
    title: 'Sistema PS2 Completo',
    image: 'https://emulators.digitalstoregames.com/images/ps2.png',
    owned: false,
    price: 30,
    relprice: 60,
    currency: 'BRL',
    description: 'Biblioteca completa PS2 com configuracao automatica.',
  };

  for (const [lang, expectedBullet] of [
    ['ptbr', /Garantia incondicional de 30 dias/],
    ['en', /30-day money-back guarantee/],
    ['es', /Garantía de 30 días/],
  ]) {
    const { unmount } = render(h(ProductCard, { product: item, lang, storeCurrency: 'BRL' }));
    fireEvent.click(screen.getAllByRole('button', { name: /Sistema PS2 Completo/i })[0]);

    const dialog = screen.getByRole('dialog', { name: 'Sistema PS2 Completo' });
    assert.ok(dialog);
    assert.ok(within(dialog).getByText('Biblioteca completa PS2 com configuracao automatica.'));
    assert.ok(within(dialog).getByText(expectedBullet));

    // Fecha por Esc
    fireEvent.keyDown(window, { key: 'Escape' });
    assert.equal(screen.queryByRole('dialog'), null);
    unmount();
  }
});
