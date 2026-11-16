// Utilitarios puros de moeda e Combo Permanente da Area de Membros.
// Aritmetica inteira em centavos com ROUND_HALF_UP garante paridade exata
// com Decimal.quantize(..., ROUND_HALF_UP) do backend (Change 1).

export function normalizeCurrency(value) {
  const code = String(value || '').trim().toUpperCase();
  return code === 'USD' ? 'USD' : 'BRL';
}

export function resolveCatalogCurrency(products, fallbackCurrency = null) {
  if (fallbackCurrency) {
    return normalizeCurrency(fallbackCurrency);
  }
  const hit = (products || []).find((p) => p?.currency);
  return normalizeCurrency(hit?.currency);
}

export function formatCurrency(value, currency = 'BRL', lang = 'ptbr') {
  const code = normalizeCurrency(currency);
  const numeric = Number(value ?? 0);
  if (code === 'USD') {
    return numeric.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }
  const locale = lang === 'en' ? 'en-US' : lang === 'es' ? 'es-ES' : 'pt-BR';
  return numeric.toLocaleString(locale, { style: 'currency', currency: 'BRL' });
}

export function round2(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

export function roundDiscountedItemPrice(price, discountPct) {
  const pct = Number(discountPct || 0);
  const priceCents = Math.round(Number(price || 0) * 100);
  if (!pct) return priceCents / 100;
  const keepPct = 100 - pct;
  const discountedCents = Math.floor((priceCents * keepPct + 50) / 100);
  return discountedCents / 100;
}

export function calculateComboSummary(selectedProducts, totalAvailableCount) {
  const items = (selectedProducts || []).filter((p) => p && p.price != null && Number(p.price) > 0);
  const count = items.length;
  const subtotal = round2(items.reduce((sum, p) => sum + Number(p.price), 0));

  let discountPct = 0;
  if (count >= 2) {
    discountPct = totalAvailableCount > 0 && count >= totalAvailableCount ? 25 : 15;
  }

  const discountedItems = items.map((item) => ({
    ...item,
    unitPrice: Number(item.price),
    discountedPrice: roundDiscountedItemPrice(item.price, discountPct),
  }));
  const total = round2(discountedItems.reduce((sum, item) => sum + item.discountedPrice, 0));
  const savings = round2(subtotal - total);

  return {
    count,
    discountPct,
    subtotal,
    total,
    savings,
    items: discountedItems,
  };
}
