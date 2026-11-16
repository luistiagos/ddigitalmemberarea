import './setup/dom.js';
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, within, cleanup, fireEvent, waitFor } from '@testing-library/react';
import api from '../services/api.js';
import { storeUser, clearAuth } from '../utils/auth.js';
import { Navbar } from '../components/Navbar.jsx';
import { ProductCard } from '../components/ProductCard.jsx';
import UnifiedPaymentModal from '../components/UnifiedPaymentModal.jsx';
import { CustomerArea } from '../pages/CustomerArea.jsx';
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
  assert.equal(hrefs.includes('/acesso'), false, 'Navbar nao deve exibir atalho Downloads (/acesso)');
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
  assert.ok(
    container.querySelector('div[data-artwork-stage="true"][data-stage-tone="transparent"]'),
    'Deve exibir recorte transparente da caixa sobre palco unificado',
  );

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

  assert.ok(screen.getByText(/\$19\.90/));
  const unlockBtn = screen.getByRole('button', { name: /^Unlock$/i });
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

// --- T3: UnifiedPaymentModal (BRL dark vs USD Stripe + erro com retry) ---

test('modal_unificado_brl_exibe_pix_dark_cartao_e_mp_link', async (t) => {
  t.after(() => {
    cleanup();
    mock.restoreAll();
  });

  const postCalls = [];
  mock.method(api, 'post', async (url, body) => {
    postCalls.push({ url, body });
    if (url === '/area-cliente/promo-checkout-pix') {
      return {
        data: {
          qr_code: '000201010212PIXCODE',
          qr_code_base64: 'AAA=',
          amount: 42.41,
        },
      };
    }
    return { data: {} };
  });

  const items = [
    { productid: 2, title: 'PS2 Pack', price: 29.90 },
    { productid: 3, title: 'Switch Pack', price: 19.99 },
  ];

  render(
    h(UnifiedPaymentModal, {
      isOpen: true,
      onClose: () => { },
      items,
      discountPct: 15,
      currency: 'BRL',
      userEmail: 'br@test.com',
      storeId: 600004,
      lang: 'ptbr',
    }),
  );

  const dialog = screen.getByRole('dialog', { name: 'Resumo do pedido' });
  assert.ok(dialog);
  // Nao usa dialog branco antigo (bg-white como painel inteiro do modal)
  assert.equal(dialog.querySelector('.bg-white.rounded-2xl'), null);

  assert.ok(screen.getByRole('button', { name: /PIX Instantâneo/i }));
  assert.ok(screen.getByRole('button', { name: /Cartão de Crédito/i }));
  assert.ok(screen.getByRole('button', { name: /Saldo ou Boleto no Mercado Pago/i }));

  await waitFor(() => {
    assert.ok(screen.getByText('000201010212PIXCODE'));
  });
  assert.equal(postCalls[0].url, '/area-cliente/promo-checkout-pix');
  assert.deepEqual(postCalls[0].body, {
    product_ids: [2, 3],
    discount_pct: 15,
    store_id: 600004,
  });
});

test('modal_unificado_usd_chama_stripe_e_oculta_pix_e_cartao_mp', async (t) => {
  t.after(() => {
    sessionStorage.removeItem('customerAreaNeedsRefresh');
    cleanup();
    mock.restoreAll();
  });

  const apiCalls = [];
  const redirects = [];
  mock.method(api, 'get', async (url, cfg) => {
    apiCalls.push({ method: 'GET', url, params: cfg?.params });
    return { data: { checkout_url: 'https://checkout.stripe.com/pay/single' } };
  });
  mock.method(api, 'post', async (url, body) => {
    apiCalls.push({ method: 'POST', url, body });
    return { data: { checkout_url: 'https://checkout.stripe.com/pay/combo' } };
  });

  // 1) Compra avulsa em loja USD -> GET /createStripeLink com from_member_area=1 e base_currency=usd
  const { rerender } = render(
    h(UnifiedPaymentModal, {
      isOpen: true,
      onClose: () => { },
      items: [{ productid: 10, title: 'World Cup Pack', price: 19.90 }],
      discountPct: 0,
      currency: 'USD',
      userEmail: 'us@test.com',
      storeId: 600010,
      lang: 'en',
      onRedirect: (u) => redirects.push(u),
    }),
  );

  assert.equal(screen.queryByRole('button', { name: /PIX/i }), null);
  assert.equal(screen.queryByRole('button', { name: /Mercado Pago/i }), null);

  fireEvent.click(screen.getByRole('button', { name: /Pay with Stripe/i }));
  await waitFor(() => {
    assert.equal(redirects.length, 1);
  });
  const firstCheckoutCalls = apiCalls.filter((c) => c.url !== '/area-cliente/telemetry');
  assert.equal(firstCheckoutCalls[0].url, '/createStripeLink');
  assert.equal(firstCheckoutCalls[0].params.from_member_area, '1');
  assert.equal(firstCheckoutCalls[0].params.base_currency, 'usd');
  assert.equal(redirects[0], 'https://checkout.stripe.com/pay/single');

  // 2) Compra combo 25% em loja USD -> POST /area-cliente/promo-checkout
  rerender(
    h(UnifiedPaymentModal, {
      isOpen: true,
      onClose: () => { },
      items: [
        { productid: 10, title: 'Pack 1', price: 20 },
        { productid: 11, title: 'Pack 2', price: 10 },
      ],
      discountPct: 25,
      currency: 'USD',
      userEmail: 'us@test.com',
      storeId: 600010,
      lang: 'en',
      onRedirect: (u) => redirects.push(u),
    }),
  );

  fireEvent.click(screen.getByRole('button', { name: /Pay with Stripe/i }));
  await waitFor(() => {
    assert.equal(redirects.length, 2);
  });
  const allCheckoutCalls = apiCalls.filter((c) => c.url !== '/area-cliente/telemetry');
  assert.equal(allCheckoutCalls[1].method, 'POST');
  assert.equal(allCheckoutCalls[1].url, '/area-cliente/promo-checkout');
  assert.deepEqual(allCheckoutCalls[1].body, {
    product_ids: [10, 11],
    discount_pct: 25,
    store_id: 600010,
  });
});

test('modal_unificado_exibe_erro_e_libera_nova_tentativa', async (t) => {
  t.after(() => {
    cleanup();
    mock.restoreAll();
  });

  let attempt = 0;
  const redirects = [];
  mock.method(api, 'get', async () => {
    attempt += 1;
    if (attempt === 1) {
      throw new Error('Network error');
    }
    return { data: { checkout_url: 'https://checkout.stripe.com/pay/retry-ok' } };
  });

  render(
    h(UnifiedPaymentModal, {
      isOpen: true,
      onClose: () => { },
      items: [{ productid: 10, title: 'Pack USD', price: 19.90 }],
      discountPct: 0,
      currency: 'USD',
      userEmail: 'us@test.com',
      storeId: 600010,
      lang: 'en',
      onRedirect: (u) => redirects.push(u),
    }),
  );

  const btn = screen.getByRole('button', { name: /Pay with Stripe/i });
  fireEvent.click(btn);

  await waitFor(() => {
    assert.ok(screen.getByText(/Could not start Stripe checkout/i));
  });
  // Botao volta habilitado e modal continua aberto para retry
  assert.equal(btn.disabled, false);

  fireEvent.click(btn);
  await waitFor(() => {
    assert.equal(redirects[0], 'https://checkout.stripe.com/pay/retry-ok');
  });
});

// --- T4: CustomerArea (barra de progresso + combo permanente 15% / 25%) ---

function installCustomerAreaMocks(catalog) {
  localStorage.setItem('storeLogoLabel_600004', 'Loja Teste');
  storeUser({ id: 100, email: 'gamer@test.com', storeId: 600004 }, 'tok-area');

  mock.method(api, 'get', async (url) => {
    if (url.includes('/list_store_catalog')) {
      return { data: catalog };
    }
    if (url.includes('/area-cliente/promo')) {
      return { data: { show: false } };
    }
    return { data: {} };
  });

  const postCalls = [];
  mock.method(api, 'post', async (url, body) => {
    postCalls.push({ url, body });
    if (url === '/area-cliente/promo-checkout-pix') {
      return { data: { qr_code: 'PIXCOMBO123', qr_code_base64: 'AAA=', amount: 48.71 } };
    }
    return { data: { ok: true } };
  });
  return postCalls;
}

test('renderiza_barra_de_progresso_navbar_e_ambient_backdrop', async (t) => {
  t.after(() => {
    localStorage.removeItem('storeLogoLabel_600004');
    clearAuth();
    cleanup();
    mock.restoreAll();
  });

  const catalog = [
    { productid: 1, title: 'Sistema Multigames', image: 'https://img/multigames.png', owned: true, deliverlink: 'https://deliv/1', currency: 'BRL', store_id: 600004 },
    { productid: 2, title: 'PS2 Pack', image: 'https://img/ps2.png', owned: false, price: 30, relprice: 60, currency: 'BRL', store_id: 600004 },
    { productid: 3, title: 'Switch Pack', image: 'https://img/sw.png', owned: false, price: 20, relprice: 40, currency: 'BRL', store_id: 600004 },
  ];
  installCustomerAreaMocks(catalog);

  const { container } = render(
    h(MemoryRouter, { initialEntries: ['/area-cliente?store_id=600004'] }, h(CustomerArea)),
  );

  await waitFor(() => {
    assert.ok(screen.getByRole('progressbar'));
  });

  const bar = screen.getByRole('progressbar');
  assert.equal(bar.getAttribute('aria-valuenow'), '33');
  assert.ok(screen.getByText(/1 de 3 sistemas desbloqueados/i));

  const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
  assert.equal(hrefs.includes('/acesso'), false);
  assert.ok(hrefs.includes('/ativar'));
  assert.ok(container.querySelector('div[data-artwork-stage="true"][data-stage-tone="transparent"]'));
});

test('combo_vitrine_aplica_15_para_parcial_e_25_para_todos_arredondado', async (t) => {
  t.after(() => {
    localStorage.removeItem('storeLogoLabel_600004');
    clearAuth();
    cleanup();
    mock.restoreAll();
  });

  const catalog = [
    { productid: 1, title: 'Owned', image: 'https://img/o.png', owned: true, deliverlink: 'https://deliv/1', currency: 'BRL', store_id: 600004 },
    { productid: 2, title: 'Pack A', image: 'https://img/a.png', owned: false, price: 29.90, relprice: 60, currency: 'BRL', store_id: 600004 },
    { productid: 3, title: 'Pack B', image: 'https://img/b.png', owned: false, price: 19.99, relprice: 40, currency: 'BRL', store_id: 600004 },
    { productid: 4, title: 'Pack C', image: 'https://img/c.png', owned: false, price: 15.05, relprice: 30, currency: 'BRL', store_id: 600004 },
  ];
  const postCalls = installCustomerAreaMocks(catalog);

  render(
    h(MemoryRouter, { initialEntries: ['/area-cliente?store_id=600004'] }, h(CustomerArea)),
  );

  await waitFor(() => {
    assert.equal(screen.getAllByRole('button', { name: /\+ Combo/i }).length, 3);
  });

  // 1 item: barra nao aparece
  const comboBtns = screen.getAllByRole('button', { name: /\+ Combo/i });
  fireEvent.click(comboBtns[0]);
  assert.equal(screen.queryByTestId('combo-bar'), null);

  // 2 itens de 3: 15% OFF -> 25.42 + 16.99 = 42.41
  fireEvent.click(comboBtns[1]);
  const barPartial = screen.getByTestId('combo-bar');
  assert.ok(within(barPartial).getByText(/15% OFF/i));
  assert.ok(within(barPartial).getByText(/42,41/));

  // 3 de 3 itens: 25% OFF -> 22.43 + 14.99 + 11.29 = 48.71
  fireEvent.click(comboBtns[2]);
  const barFull = screen.getByTestId('combo-bar');
  assert.ok(within(barFull).getByText(/25% OFF/i));
  assert.ok(within(barFull).getByText(/48,71/));

  // Abre modal unificado direto pelo ComboBar e gera PIX com discount_pct=25
  fireEvent.click(within(barFull).getByRole('button', { name: /Desbloquear Combo/i }));
  await waitFor(() => {
    assert.ok(screen.getByText('PIXCOMBO123'));
  });
  const pixCall = postCalls.find((c) => c.url === '/area-cliente/promo-checkout-pix');
  assert.ok(pixCall);
  assert.deepEqual(pixCall.body, {
    product_ids: [2, 3, 4],
    discount_pct: 25,
    store_id: 600004,
  });
});
