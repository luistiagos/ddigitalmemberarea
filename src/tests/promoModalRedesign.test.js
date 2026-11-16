import './setup/dom.js';
import fs from 'node:fs';
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, within, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import api from '../services/api.js';
import { storeUser, clearAuth } from '../utils/auth.js';
import PromoModal from '../components/PromoModal.jsx';
import { CustomerArea } from '../pages/CustomerArea.jsx';
import {
  classifyCornerSamples,
  inferInitialStageStyle,
  resolveTransparentBoxCutout,
} from '../utils/artworkStage.js';

const PROMO_ITEMS = [
  { productid: 101, title: 'Sistema PlayStation 2 Edicao Completa Definitiva', image: 'https://img/ps2.png', price: 40, price_25: 30, price_50: 20, currency: 'BRL' },
  { productid: 102, title: 'Sistema Nintendo Switch Colecao Expandida', image: 'https://img/sw.png', price: 60, price_25: 45, price_50: 30, currency: 'BRL' },
  { productid: 103, title: 'Sistema Xbox 360 Biblioteca Completa', image: 'https://img/x360.png', price: 20, price_25: 15, price_50: 10, currency: 'BRL' },
];

const USD_PROMO_ITEMS = [
  { productid: 201, title: 'PlayStation 2 Full System Bundle', image: 'https://img/ps2.png', price: 20, price_25: 15, price_50: 10, currency: 'USD' },
  { productid: 202, title: 'Nintendo Switch Full Collection', image: 'https://img/sw.png', price: 10, price_25: 7.5, price_50: 5, currency: 'USD' },
];

function setup5sTimerSpy() {
  const origSetTimeout = globalThis.setTimeout;
  const origClearTimeout = globalThis.clearTimeout;
  const scheduled = [];
  let seq = 900000;

  globalThis.setTimeout = (fn, delay, ...args) => {
    if (delay === 5000) {
      const id = ++seq;
      scheduled.push({ id, fn: () => fn(...args), delay, cancelled: false, fired: false });
      return id;
    }
    return origSetTimeout(fn, delay, ...args);
  };

  globalThis.clearTimeout = (id) => {
    const entry = scheduled.find((item) => item.id === id);
    if (entry) {
      entry.cancelled = true;
      return;
    }
    origClearTimeout(id);
  };

  return {
    scheduled,
    flushAll() {
      for (const entry of scheduled) {
        if (!entry.cancelled && !entry.fired) {
          entry.fired = true;
          entry.fn();
        }
      }
    },
    restore() {
      globalThis.setTimeout = origSetTimeout;
      globalThis.clearTimeout = origClearTimeout;
    },
  };
}

function installAreaMocks({ promoResponse, postOverride } = {}) {
  localStorage.setItem('storeLogoLabel_600004', 'Digital Store');
  storeUser({ id: 40, email: 'vip@test.com', storeId: 600004 }, 'tok-vip');

  const postCalls = [];
  mock.method(api, 'get', async (url) => {
    if (url.includes('/list_store_catalog')) {
      return {
        data: [
          { productid: 1, title: 'Sistema Multigames', image: 'https://img/multigames.png', owned: true, deliverlink: 'https://acesso/1', currency: 'BRL', store_id: 600004 },
          { productid: 101, title: PROMO_ITEMS[0].title, image: PROMO_ITEMS[0].image, owned: false, price: 40, relprice: 80, currency: 'BRL', store_id: 600004 },
          { productid: 102, title: PROMO_ITEMS[1].title, image: PROMO_ITEMS[1].image, owned: false, price: 60, relprice: 120, currency: 'BRL', store_id: 600004 },
        ],
      };
    }
    if (url.includes('/area-cliente/promo')) {
      return { data: promoResponse };
    }
    return { data: { store: { checkout_logo_label: 'Digital Store' } } };
  });

  mock.method(api, 'post', async (url, body) => {
    postCalls.push({ url, body });
    if (postOverride) {
      const custom = await postOverride(url, body);
      if (custom !== undefined) return custom;
    }
    if (url === '/area-cliente/promo-checkout-pix') {
      return { data: { qr_code: 'PIXPROMO999', qr_code_base64: 'AAA=', amount: 75 } };
    }
    if (url === '/area-cliente/promo-checkout') {
      return { data: { checkout_url: 'https://mp.test/promo' } };
    }
    return { data: { ok: true } };
  });

  return postCalls;
}

function resetAreaTestState(timerSpy) {
  timerSpy?.restore();
  sessionStorage.removeItem('promoModalShownThisSession');
  sessionStorage.removeItem('customerAreaNeedsRefresh');
  localStorage.removeItem('storeLogoLabel_600004');
  clearAuth();
  cleanup();
  mock.restoreAll();
}

test('exibe_banner_persistente_e_abre_promo_modal_apos_5s', async (t) => {
  const timerSpy = setup5sTimerSpy();
  t.after(() => resetAreaTestState(timerSpy));

  const postCalls = installAreaMocks({
    promoResponse: {
      show: true,
      already_shown_in_window: false,
      downsell_variant: 'full_50',
      currency: 'BRL',
      products: PROMO_ITEMS.slice(0, 2),
    },
  });

  render(h(MemoryRouter, { initialEntries: ['/area-cliente?store_id=600004'] }, h(CustomerArea)));

  await waitFor(() => {
    assert.ok(screen.getByTestId('vip-promo-banner'));
    assert.ok(timerSpy.scheduled.some((s) => s.delay === 5000 && !s.cancelled));
  });
  assert.equal(screen.queryByTestId('promo-modal-dialog'), null);

  act(() => {
    timerSpy.flushAll();
  });

  await waitFor(() => {
    assert.ok(screen.getByTestId('promo-modal-dialog'));
  });
  assert.ok(postCalls.some((c) => c.url === '/area-cliente/promo-seen'));
  assert.ok(postCalls.some((c) => c.url === '/area-cliente/telemetry' && c.body?.event === 'promo_modal_open'));
});

test('nao_reabre_automaticamente_quando_already_shown_in_window_true', async (t) => {
  const timerSpy = setup5sTimerSpy();
  t.after(() => resetAreaTestState(timerSpy));

  const postCalls = installAreaMocks({
    promoResponse: {
      show: true,
      already_shown_in_window: true,
      downsell_variant: 'single_50',
      currency: 'BRL',
      products: PROMO_ITEMS.slice(0, 2),
    },
  });

  render(h(MemoryRouter, { initialEntries: ['/area-cliente?store_id=600004'] }, h(CustomerArea)));

  await waitFor(() => {
    assert.ok(screen.getByTestId('vip-promo-banner'));
  });

  act(() => {
    timerSpy.flushAll();
  });

  assert.equal(timerSpy.scheduled.length, 0);
  assert.equal(screen.queryByTestId('promo-modal-dialog'), null);

  // Reabertura manual pelo Banner Persistente funciona
  fireEvent.click(within(screen.getByTestId('vip-promo-banner')).getByRole('button', { name: /Ver oferta VIP/i }));
  await waitFor(() => {
    assert.ok(screen.getByTestId('promo-modal-dialog'));
  });
  assert.ok(postCalls.some((c) => c.url === '/area-cliente/telemetry' && c.body?.event === 'promo_banner_click'));
});

test('cancela_timer_5s_ao_clicar_acessar_ou_abrir_outro_modal', async (t) => {
  const timerSpy = setup5sTimerSpy();
  t.after(() => resetAreaTestState(timerSpy));

  installAreaMocks({
    promoResponse: {
      show: true,
      already_shown_in_window: false,
      downsell_variant: 'full_50',
      currency: 'BRL',
      products: PROMO_ITEMS.slice(0, 2),
    },
  });

  render(h(MemoryRouter, { initialEntries: ['/area-cliente?store_id=600004'] }, h(CustomerArea)));

  await waitFor(() => {
    assert.ok(screen.getByTestId('vip-promo-banner'));
    assert.equal(timerSpy.scheduled.length, 1);
  });

  // Clicar em Acessar no item adquirido cancela o timer de 5s e nao interrompe o consumo
  const accessLink = screen.getByRole('link', { name: /Acessar/i });
  fireEvent.click(accessLink);

  assert.equal(timerSpy.scheduled[0].cancelled, true);
  act(() => {
    timerSpy.flushAll();
  });
  assert.equal(screen.queryByTestId('promo-modal-dialog'), null);
  assert.ok(screen.getByTestId('vip-promo-banner'));

  // Nova renderizacao: abrir Preview antes de 5s tambem cancela o timer automatico
  resetAreaTestState(timerSpy);
  const timerSpy2 = setup5sTimerSpy();
  installAreaMocks({
    promoResponse: {
      show: true,
      already_shown_in_window: false,
      downsell_variant: 'full_50',
      currency: 'BRL',
      products: PROMO_ITEMS.slice(0, 2),
    },
  });
  render(h(MemoryRouter, { initialEntries: ['/area-cliente?store_id=600004'] }, h(CustomerArea)));
  await waitFor(() => {
    assert.ok(screen.getByTestId('vip-promo-banner'));
  });
  fireEvent.click(screen.getAllByRole('button', { name: /Detalhes/i })[0]);
  assert.equal(timerSpy2.scheduled[0].cancelled, true);
  act(() => {
    timerSpy2.flushAll();
  });
  assert.equal(screen.queryByTestId('promo-modal-dialog'), null);
  timerSpy2.restore();
});

test('promo_modal_renderiza_layout_amplo_fecha_por_esc_e_sem_confirmshaming', (t) => {
  t.after(() => {
    cleanup();
    mock.restoreAll();
  });
  mock.method(api, 'post', async () => ({ data: { ok: true } }));

  let closed = 0;
  render(
    h(PromoModal, {
      isOpen: true,
      products: PROMO_ITEMS,
      storeId: 600004,
      currency: 'BRL',
      downsellVariant: 'full_50',
      lang: 'ptbr',
      onClose: () => { closed += 1; },
    }),
  );

  const dialog = screen.getByTestId('promo-modal-dialog');
  assert.match(dialog.className, /max-w-2xl/);
  assert.ok(within(dialog).getByText(PROMO_ITEMS[0].title));
  assert.ok(within(dialog).getByLabelText(/Fechar oferta/i));

  const fullText = dialog.textContent || '';
  assert.equal(/vou perder|pass up|quiero perder/i.test(fullText), false);

  fireEvent.keyDown(window, { key: 'Escape' });
  assert.equal(closed, 1);
});

test('etapa_1_25_permite_desmarcar_itens_e_recalcula_total', async (t) => {
  t.after(() => {
    cleanup();
    mock.restoreAll();
  });

  const postCalls = [];
  mock.method(api, 'post', async (url, body) => {
    postCalls.push({ url, body });
    if (url === '/area-cliente/promo-checkout-pix') {
      return { data: { qr_code: 'PIX25CHECK', qr_code_base64: 'AAA=', amount: 45 } };
    }
    return { data: { ok: true } };
  });

  render(
    h(PromoModal, {
      isOpen: true,
      products: PROMO_ITEMS,
      storeId: 600004,
      currency: 'BRL',
      downsellVariant: 'full_50',
      lang: 'ptbr',
      onClose: () => {},
    }),
  );

  const dialog = screen.getByTestId('promo-modal-dialog');
  // Todos pre-selecionados: 30 + 45 + 15 = 90,00
  assert.ok(within(dialog).getByText(/90,00/));

  // Desmarca item 101 e item 103 -> resta apenas item 102 (R$ 45,00)
  const checkboxes = within(dialog).getAllByRole('checkbox');
  fireEvent.click(checkboxes[0]);
  fireEvent.click(checkboxes[2]);
  assert.ok(within(dialog).getAllByText(/45,00/).length >= 1);
  assert.ok(within(dialog).getByText(/1 sistema\(s\) selecionado\(s\)/));

  // Tentar desmarcar o ultimo restante mantem >= 1 item selecionado
  fireEvent.click(checkboxes[1]);
  assert.equal(checkboxes[1].getAttribute('aria-checked'), 'true');
  assert.ok(within(dialog).getByRole('status'));

  fireEvent.click(within(dialog).getByRole('button', { name: /Desbloquear selecionados/i }));
  await waitFor(() => {
    assert.ok(screen.getByText('PIX25CHECK'));
  });
  const pixCall = postCalls.find((c) => c.url === '/area-cliente/promo-checkout-pix');
  assert.ok(pixCall);
  assert.deepEqual(pixCall.body, { product_ids: [102], discount_pct: 25, store_id: 600004 });
});

test('etapa_2_50_respeita_variante_full_e_single', (t) => {
  t.after(() => {
    cleanup();
    mock.restoreAll();
  });
  mock.method(api, 'post', async () => ({ data: { ok: true } }));

  const { unmount } = render(
    h(PromoModal, {
      isOpen: true,
      products: PROMO_ITEMS,
      currency: 'BRL',
      downsellVariant: 'full_50',
      lang: 'ptbr',
      onClose: () => {},
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: /Talvez depois/i }));
  assert.equal(screen.queryByRole('radiogroup'), null);
  assert.ok(screen.getByRole('button', { name: /Liberar pacote completo/i }));
  unmount();

  render(
    h(PromoModal, {
      isOpen: true,
      products: PROMO_ITEMS,
      currency: 'BRL',
      downsellVariant: 'single_50',
      lang: 'ptbr',
      onClose: () => {},
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: /Talvez depois/i }));
  assert.ok(screen.getByRole('radiogroup'));
  assert.equal(screen.getAllByRole('radio').length, 3);
  assert.ok(screen.getByRole('button', { name: /Liberar sistema escolhido/i }));
});

test('etapa_2_50_variante_full_envia_todos', async (t) => {
  t.after(() => {
    cleanup();
    mock.restoreAll();
  });
  const postCalls = [];
  mock.method(api, 'post', async (url, body) => {
    postCalls.push({ url, body });
    if (url === '/area-cliente/promo-checkout-pix') {
      return { data: { qr_code: 'PIX50FULL', qr_code_base64: 'AAA=', amount: 60 } };
    }
    return { data: { ok: true } };
  });

  render(
    h(PromoModal, {
      isOpen: true,
      products: PROMO_ITEMS,
      storeId: 600004,
      currency: 'BRL',
      downsellVariant: 'full_50',
      lang: 'ptbr',
      onClose: () => {},
    }),
  );

  fireEvent.click(screen.getByRole('button', { name: /Talvez depois/i }));
  fireEvent.click(screen.getByRole('button', { name: /Liberar pacote completo/i }));

  await waitFor(() => {
    assert.ok(screen.getByText('PIX50FULL'));
  });
  const pixCall = postCalls.find((c) => c.url === '/area-cliente/promo-checkout-pix');
  assert.deepEqual(pixCall.body, { product_ids: [101, 102, 103], discount_pct: 50, store_id: 600004 });
});

test('etapa_2_50_variante_single_escolhe_um', async (t) => {
  t.after(() => {
    cleanup();
    mock.restoreAll();
  });
  const postCalls = [];
  mock.method(api, 'post', async (url, body) => {
    postCalls.push({ url, body });
    if (url === '/area-cliente/promo-checkout-pix') {
      return { data: { qr_code: 'PIX50SINGLE', qr_code_base64: 'AAA=', amount: 10 } };
    }
    return { data: { ok: true } };
  });

  render(
    h(PromoModal, {
      isOpen: true,
      products: PROMO_ITEMS,
      storeId: 600004,
      currency: 'BRL',
      downsellVariant: 'single_50',
      lang: 'ptbr',
      onClose: () => {},
    }),
  );

  fireEvent.click(screen.getByRole('button', { name: /Talvez depois/i }));
  const radios = screen.getAllByRole('radio');
  fireEvent.click(radios[2]); // seleciona produto 103 (R$ 10,00 com 50%)
  assert.equal(radios[2].getAttribute('aria-checked'), 'true');
  assert.equal(radios[0].getAttribute('aria-checked'), 'false');

  fireEvent.click(screen.getByRole('button', { name: /Liberar sistema escolhido/i }));
  await waitFor(() => {
    assert.ok(screen.getByText('PIX50SINGLE'));
  });
  const pixCall = postCalls.find((c) => c.url === '/area-cliente/promo-checkout-pix');
  assert.deepEqual(pixCall.body, { product_ids: [103], discount_pct: 50, store_id: 600004 });
});

test('promo_modal_pagamento_respeita_moeda_brl_e_usd', async (t) => {
  t.after(() => {
    cleanup();
    mock.restoreAll();
  });
  const postCalls = [];
  const redirects = [];
  mock.method(api, 'post', async (url, body) => {
    postCalls.push({ url, body });
    if (url === '/area-cliente/promo-checkout-pix') {
      return { data: { qr_code: 'PIXBRL', qr_code_base64: 'AAA=', amount: 30 } };
    }
    if (url === '/area-cliente/promo-checkout') {
      return { data: { checkout_url: 'https://checkout.stripe.com/pay/promo_usd_50' } };
    }
    return { data: { ok: true } };
  });

  // 1) Loja BRL: exibe PIX dark, Cartao e Link MP
  const { unmount } = render(
    h(PromoModal, {
      isOpen: true,
      products: [PROMO_ITEMS[0]],
      storeId: 600004,
      currency: 'BRL',
      downsellVariant: 'full_50',
      lang: 'ptbr',
      onClose: () => {},
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: /Desbloquear selecionados/i }));
  await waitFor(() => {
    assert.ok(screen.getByRole('button', { name: /PIX Instantâneo/i }));
    assert.ok(screen.getByRole('button', { name: /Cartão de Crédito/i }));
    assert.ok(screen.getByRole('button', { name: /Saldo ou Boleto no Mercado Pago/i }));
  });
  fireEvent.click(screen.getByRole('button', { name: /Saldo ou Boleto no Mercado Pago/i }));
  assert.ok(screen.getByRole('button', { name: /Link Mercado Pago/i }));
  unmount();

  // 2) Loja USD: exibe apenas Stripe e oculta PIX/Cartao/MP
  render(
    h(PromoModal, {
      isOpen: true,
      products: USD_PROMO_ITEMS,
      storeId: 600010,
      currency: 'USD',
      downsellVariant: 'single_50',
      lang: 'en',
      onClose: () => {},
      onRedirect: (url) => redirects.push(url),
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: /Maybe later/i }));
  fireEvent.click(screen.getByRole('button', { name: /Unlock chosen system/i }));

  await waitFor(() => {
    assert.ok(screen.getByRole('button', { name: /Pay with Stripe/i }));
  });
  assert.equal(screen.queryByRole('button', { name: /PIX/i }), null);
  assert.equal(screen.queryByRole('button', { name: /Mercado Pago/i }), null);

  fireEvent.click(screen.getByRole('button', { name: /Pay with Stripe/i }));
  await waitFor(() => {
    assert.equal(redirects[0], 'https://checkout.stripe.com/pay/promo_usd_50');
  });
  const stripeCall = postCalls.find((c) => c.url === '/area-cliente/promo-checkout');
  assert.deepEqual(stripeCall.body, { product_ids: [201], discount_pct: 50, store_id: 600010 });
});

test('telemetria_dispara_eventos_de_funil_sem_bloquear_fluxo', async (t) => {
  const timerSpy = setup5sTimerSpy();
  t.after(() => resetAreaTestState(timerSpy));

  // Forca erro HTTP 500 em TODA chamada de telemetria para provar resiliencia
  const telemetryEvents = [];
  installAreaMocks({
    promoResponse: {
      show: true,
      already_shown_in_window: true,
      downsell_variant: 'single_50',
      currency: 'BRL',
      products: PROMO_ITEMS.slice(0, 2),
    },
    postOverride: async (url, body) => {
      if (url === '/area-cliente/telemetry') {
        telemetryEvents.push(body);
        throw new Error('Telemetry backend offline');
      }
      return undefined;
    },
  });

  render(h(MemoryRouter, { initialEntries: ['/area-cliente?store_id=600004'] }, h(CustomerArea)));

  await waitFor(() => {
    assert.ok(screen.getByTestId('vip-promo-banner'));
  });
  await waitFor(() => {
    assert.ok(telemetryEvents.some((e) => e.event === 'member_area_view'));
  });

  // 1) Clique no ComboBar checkout funciona mesmo com telemetria rejeitando
  const comboBtns = screen.getAllByRole('button', { name: /\+ Combo/i });
  fireEvent.click(comboBtns[0]);
  fireEvent.click(comboBtns[1]);
  fireEvent.click(within(screen.getByTestId('combo-bar')).getByRole('button', { name: /Desbloquear Combo/i }));
  await waitFor(() => {
    assert.ok(screen.getByText('PIXPROMO999'));
  });
  assert.ok(telemetryEvents.some((e) => e.event === 'combo_bar_checkout_click' && e.discount_pct === 25));

  // Seleciona metodo Cartao dentro do UnifiedPaymentModal -> dispara payment_method_selected
  fireEvent.click(screen.getByRole('button', { name: /Cartão de Crédito/i }));
  assert.ok(telemetryEvents.some((e) => e.event === 'payment_method_selected' && e.method === 'card'));
  fireEvent.click(screen.getByRole('button', { name: /Fechar/i }));

  // 2) Banner click -> PromoModal -> Step 25 decline -> Step 50 accept
  fireEvent.click(within(screen.getByTestId('vip-promo-banner')).getByRole('button', { name: /Ver oferta VIP/i }));
  await waitFor(() => {
    assert.ok(screen.getByTestId('promo-modal-dialog'));
  });
  fireEvent.click(screen.getByRole('button', { name: /Talvez depois/i }));
  fireEvent.click(screen.getByRole('button', { name: /Liberar sistema escolhido/i }));

  await waitFor(() => {
    assert.ok(screen.getByText('PIXPROMO999'));
  });

  const eventNames = new Set(telemetryEvents.map((e) => e.event));
  for (const requiredEvent of [
    'member_area_view',
    'combo_bar_checkout_click',
    'payment_method_selected',
    'promo_banner_click',
    'promo_modal_open',
    'promo_step_action',
  ]) {
    assert.ok(eventNames.has(requiredEvent), `Evento ausente: ${requiredEvent}`);
  }
});

test('contraste_rodape_legivel_botoes_verdes_texto_branco_e_fundo_branco_nos_produtos', async (t) => {
  const timerSpy = setup5sTimerSpy();
  t.after(() => resetAreaTestState(timerSpy));

  // 1) CheckoutPage.css nao pode vazar regras globais `a {` ou `.grid {` para o restante da SPA
  const checkoutCss = fs.readFileSync(new URL('../pages/CheckoutPage.css', import.meta.url), 'utf8');
  assert.equal(/(?:^|\n)a\s*\{/m.test(checkoutCss), false, 'Regra `a {` deve ficar escopada em `.wrap a`');
  assert.equal(/(?:^|\n)\.grid\s*\{/m.test(checkoutCss), false, 'Regra `.grid {` deve ficar escopada em `.modal .grid`');
  assert.match(checkoutCss, /\.wrap a\s*\{/);
  assert.match(checkoutCss, /\.modal \.grid\s*\{/);

  installAreaMocks({ promoResponse: { show: false } });
  const { container } = render(
    h(MemoryRouter, { initialEntries: ['/area-cliente?store_id=600004'] }, h(CustomerArea)),
  );

  await waitFor(() => {
    assert.ok(screen.getByRole('link', { name: /Acessar/i }));
  });

  // 2) Botao verde `Acessar` deve ter texto branco (`text-white`)
  const accessBtn = screen.getByRole('link', { name: /Acessar/i });
  assert.match(accessBtn.className, /\btext-white\b/);

  // 3) Showcase das imagens usa recortes transparentes locais em public/images/boxes/*.webp com moldura estilo Checkout
  const stages = container.querySelectorAll('div[data-artwork-stage="true"]');
  assert.ok(stages.length >= 3);
  assert.equal(stages[0].getAttribute('data-stage-tone'), 'transparent');
  assert.equal(stages[0].className.includes('bg-white'), false);
  assert.ok(container.querySelector('div[data-checkout-frame="true"]'));
  const renderedImgs = container.querySelectorAll('div[data-artwork-stage="true"] img');
  assert.match(renderedImgs[0].getAttribute('src'), /^\/images\/boxes\/multigames\.webp$/);

  // Recortes transparentes resolvidos e presentes no public/images/boxes
  for (const rawUrl of [
    'https://emulators.digitalstoregames.com/images/multigames.png',
    'https://emulators.digitalstoregames.com/images/plataformamultigames.jpeg',
    'https://emulators.digitalstoregames.com/52emul/checkout2/images/switchbox.webp',
    'https://emulators.digitalstoregames.com/52emul/checkout2/images/saturnbox.webp',
    'https://emulators.digitalstoregames.com/52emul/checkout2/images/xboxclassicbox.webp',
    'https://emulators.digitalstoregames.com/52emul/checkout2/images/xbox360.webp',
    'https://emulators.digitalstoregames.com/images/psvita.png',
  ]) {
    const mapped = resolveTransparentBoxCutout(rawUrl);
    assert.ok(mapped, `Deveria mapear recorte transparente para ${rawUrl}`);
    assert.ok(fs.existsSync(new URL(`../../public${mapped}`, import.meta.url)), `Arquivo ausente: public${mapped}`);
    assert.equal(inferInitialStageStyle(rawUrl).tone, 'transparent');
  }

  // Fallback por amostragem continua valido para imagens externas fora do mapa
  assert.equal(inferInitialStageStyle('https://cdn/images/album_externo.webp').tone, 'dark');
  const lightSample = classifyCornerSamples([
    { r: 245, g: 245, b: 248, a: 255 },
    { r: 245, g: 245, b: 248, a: 255 },
    { r: 252, g: 252, b: 255, a: 255 },
    { r: 252, g: 252, b: 255, a: 255 },
  ]);
  assert.equal(lightSample.tone, 'light');
  assert.equal(lightSample.background, '#ffffff');
  const darkSample = classifyCornerSamples([
    { r: 37, g: 37, b: 37, a: 255 },
    { r: 38, g: 38, b: 38, a: 255 },
    { r: 66, g: 66, b: 66, a: 255 },
    { r: 56, g: 56, b: 56, a: 255 },
  ]);
  assert.equal(darkSample.tone, 'dark');
  assert.match(darkSample.background, /^linear-gradient\(180deg, rgb\(38, 38, 38\)/);
  assert.ok(darkSample.maskImage);

  // 4) Rodape deve usar cores claras de alto contraste em fundo escuro
  const footer = container.querySelector('footer');
  assert.ok(footer);
  assert.match(footer.textContent, /Precisa de ajuda/i);
  const waLink = within(footer).getByRole('link', { name: /\+55 41 9626-0115/i });
  const mailLink = within(footer).getByRole('link', { name: /contato@digitalstoregames\.com/i });
  assert.match(waLink.className, /text-emerald-300/);
  assert.match(mailLink.className, /text-sky-300/);
});
