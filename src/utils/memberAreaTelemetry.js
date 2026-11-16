import api from '@/services/api';

export const MEMBER_AREA_TELEMETRY_EVENTS = Object.freeze({
  MEMBER_AREA_VIEW: 'member_area_view',
  PROMO_BANNER_CLICK: 'promo_banner_click',
  PROMO_MODAL_OPEN: 'promo_modal_open',
  PROMO_STEP_ACTION: 'promo_step_action',
  COMBO_BAR_CHECKOUT_CLICK: 'combo_bar_checkout_click',
  PAYMENT_METHOD_SELECTED: 'payment_method_selected',
});

export const ALLOWED_MEMBER_AREA_TELEMETRY_EVENTS = new Set(
  Object.values(MEMBER_AREA_TELEMETRY_EVENTS),
);

const ALLOWED_PAYLOAD_KEYS = [
  'store_id',
  'downsell_variant',
  'step',
  'action',
  'discount_pct',
  'method',
  'currency',
  'item_count',
  'origin',
  'source',
];

/**
 * Dispara telemetria do funil da Area de Membros de forma assincrona (fire-and-forget).
 * Nunca propaga excecoes nem bloqueia navegacao, modais ou checkout.
 */
export function trackMemberAreaEvent(event, payload = {}) {
  if (!event || !ALLOWED_MEMBER_AREA_TELEMETRY_EVENTS.has(event)) {
    return;
  }

  const body = { event };
  if (payload && typeof payload === 'object') {
    for (const key of ALLOWED_PAYLOAD_KEYS) {
      const value = payload[key];
      if (value !== undefined && value !== null && value !== '') {
        body[key] = value;
      }
    }
  }

  try {
    const req = api.post('/area-cliente/telemetry', body);
    if (req && typeof req.catch === 'function') {
      req.catch(() => {});
    }
  } catch (_) {
    // Telemetria nao pode impactar cliques ou checkout.
  }
}
