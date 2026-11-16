import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, QrCode, CreditCard, ExternalLink, Loader2, ShieldCheck, Copy, Check } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import api from '@/services/api';
import { TRANSLATIONS } from '@/pages/translations';
import {
  formatCurrency,
  normalizeCurrency,
  round2,
  roundDiscountedItemPrice,
} from '@/utils/memberAreaPricing';

const CUSTOMER_AREA_REFRESH_KEY = 'customerAreaNeedsRefresh';
const MP_PUBLIC_KEY = 'APP_USR-747cf787-a851-4ed5-971c-62041281ed91';

export default function UnifiedPaymentModal({
  isOpen,
  onClose,
  items = [],
  discountPct = 0,
  currency = 'BRL',
  userEmail = '',
  storeId = null,
  lang = 'ptbr',
  onPaymentComplete,
  onRedirect,
}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ptbr;
  const activeCurrency = normalizeCurrency(currency);
  const isUSD = activeCurrency === 'USD';
  const isCombo = Number(discountPct) > 0;

  const [activeTab, setActiveTab] = useState('pix');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [pixData, setPixData] = useState(null);
  const [pixStatusMsg, setPixStatusMsg] = useState('');
  const [pixCopied, setPixCopied] = useState(false);
  const [cardStatus, setCardStatus] = useState('');
  const [cardStatusMsg, setCardStatusMsg] = useState('');

  const pixPollingRef = useRef(null);
  const mpBricksCtrl = useRef(null);
  const pixAttemptedKeyRef = useRef('');

  const productIds = useMemo(() => items.map((p) => p.productid), [items]);
  const summary = useMemo(() => {
    const subtotal = round2(items.reduce((acc, item) => acc + Number(item.price || 0), 0));
    const total = round2(
      items.reduce((acc, item) => acc + roundDiscountedItemPrice(item.price || 0, discountPct), 0),
    );
    return {
      subtotal,
      total,
      savings: round2(subtotal - total),
    };
  }, [items, discountPct]);

  const clearPixPolling = useCallback(() => {
    if (pixPollingRef.current) {
      clearInterval(pixPollingRef.current);
      pixPollingRef.current = null;
    }
  }, []);

  const unmountCardBrick = useCallback(() => {
    if (mpBricksCtrl.current) {
      try { mpBricksCtrl.current.unmount(); } catch (_) {}
      mpBricksCtrl.current = null;
    }
  }, []);

  const navigateExternal = useCallback((url) => {
    if (typeof window === 'undefined' || !url) return;
    sessionStorage.setItem(CUSTOMER_AREA_REFRESH_KEY, '1');
    if (onRedirect) {
      onRedirect(url);
    } else {
      window.location.href = url;
    }
  }, [onRedirect]);

  // Reset modal state whenever opened for new selection or closed
  useEffect(() => {
    if (!isOpen) {
      clearPixPolling();
      unmountCardBrick();
      setActiveTab('pix');
      setSubmitting(false);
      setErrorMsg(null);
      setPixData(null);
      setPixStatusMsg('');
      setPixCopied(false);
      setCardStatus('');
      setCardStatusMsg('');
      pixAttemptedKeyRef.current = '';
    }
    return () => {
      clearPixPolling();
      unmountCardBrick();
    };
  }, [isOpen, clearPixPolling, unmountCardBrick]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  const requestPix = useCallback(async () => {
    if (!productIds.length) return;
    setSubmitting(true);
    setErrorMsg(null);
    setPixStatusMsg('');
    clearPixPolling();
    try {
      const res = isCombo
        ? await api.post('/area-cliente/promo-checkout-pix', {
            product_ids: productIds,
            discount_pct: Number(discountPct),
            ...(storeId ? { store_id: storeId } : {}),
          })
        : await api.post('/create_pix_payment', {
            sids: productIds.join(','),
            email: userEmail,
            storeid: storeId,
          });

      const data = res.data;
      if (data?.error) {
        setErrorMsg(data.error);
        return;
      }
      if (!data?.qr_code) {
        setErrorMsg(t.pixUnavailable);
        return;
      }
      setPixData(data);

      if (data.payment_id) {
        pixPollingRef.current = setInterval(async () => {
          try {
            const statusRes = await api.get(`/payment_status?payment_id=${data.payment_id}`);
            const st = statusRes.data?.status;
            if (st === 'approved') {
              clearPixPolling();
              setPixStatusMsg(t.paymentApprovedMsg);
              setTimeout(() => { onPaymentComplete?.(); }, 1800);
            } else if (['rejected', 'cancelled', 'expired'].includes(st)) {
              clearPixPolling();
              setPixStatusMsg(t.pixExpiredMsg);
            }
          } catch (_) { /* silent polling retry */ }
        }, 5000);
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.error || t.pixGenError);
    } finally {
      setSubmitting(false);
    }
  }, [productIds, isCombo, discountPct, storeId, userEmail, t, clearPixPolling, onPaymentComplete]);

  // Auto-generate PIX once when opening BRL modal on PIX tab
  useEffect(() => {
    if (!isOpen || isUSD || activeTab !== 'pix' || pixData || submitting) return;
    const key = `${productIds.join(',')}:${discountPct}:${storeId ?? ''}`;
    if (pixAttemptedKeyRef.current === key) return;
    pixAttemptedKeyRef.current = key;
    requestPix();
  }, [isOpen, isUSD, activeTab, pixData, submitting, productIds, discountPct, storeId, requestPix]);

  // Mount Mercado Pago Card Brick when in BRL Card tab
  useEffect(() => {
    if (!isOpen || isUSD || activeTab !== 'card') {
      unmountCardBrick();
      return undefined;
    }

    setCardStatus('');
    setCardStatusMsg('');
    const containerId = 'unified-card-brick-container';

    if (!summary.total || summary.total <= 0) {
      const el = document.getElementById(containerId);
      if (el) el.innerHTML = `<p style="color:#f87171;text-align:center;padding:16px">${t.invalidPriceError}</p>`;
      return undefined;
    }

    function initBrick() {
      const container = document.getElementById(containerId);
      if (!container || typeof window.MercadoPago !== 'function') return;
      container.innerHTML = '';
      try {
        const mp = new window.MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
        mp.bricks().create('cardPayment', containerId, {
          initialization: { amount: summary.total, payer: { email: userEmail || '' } },
          customization: {
            visual: { style: { theme: 'dark' } },
            paymentMethods: { creditCard: 'all', debitCard: 'all' },
          },
          callbacks: {
            onReady: () => {},
            onSubmit: async (cardData) => {
              setCardStatus('');
              setCardStatusMsg('');
              const sharedFields = {
                token: cardData.token,
                installments: cardData.installments,
                payment_method_id: cardData.payment_method_id,
                email: cardData.payer?.email || userEmail,
                ...(cardData.payer?.identification?.number
                  ? {
                      identification_type: cardData.payer.identification.type || 'CPF',
                      identification_number: cardData.payer.identification.number,
                    }
                  : {}),
              };
              try {
                const res = isCombo
                  ? await api.post('/area-cliente/promo-checkout-card', {
                      ...sharedFields,
                      product_ids: productIds,
                      discount_pct: Number(discountPct),
                      ...(storeId ? { store_id: storeId } : {}),
                    })
                  : await api.post('/create_card_payment', {
                      ...sharedFields,
                      sids: productIds.join(','),
                      storeid: storeId,
                    });
                const data = res.data;
                if (data?.error) {
                  setCardStatus('error');
                  setCardStatusMsg(data.error);
                } else if (data?.status === 'approved') {
                  setCardStatus('success');
                  setCardStatusMsg(t.paymentApprovedMsg);
                  unmountCardBrick();
                  setTimeout(() => { onPaymentComplete?.(); }, 1800);
                } else if (data?.status === 'in_process' || data?.status === 'pending') {
                  setCardStatus('pending');
                  setCardStatusMsg(t.paymentPendingMsg);
                  setTimeout(() => { onPaymentComplete?.(); }, 2600);
                } else {
                  setCardStatus('error');
                  setCardStatusMsg(`${t.paymentDeclinedMsg} (${data?.status_detail || data?.status})`);
                }
              } catch (err) {
                setCardStatus('error');
                setCardStatusMsg(err?.response?.data?.error || t.paymentErrMsg);
              }
            },
            onError: (err) => {
              if (err?.type !== 'non_critical') {
                setCardStatus('error');
                setCardStatusMsg(t.cardFormErrMsg);
              }
            },
          },
        }).then((ctrl) => { mpBricksCtrl.current = ctrl; });
      } catch (_) {
        const el = document.getElementById(containerId);
        if (el) el.innerHTML = `<p style="color:#f87171;text-align:center;padding:16px">${t.cardFormLoadError}</p>`;
      }
    }

    if (typeof window.MercadoPago === 'function') {
      initBrick();
    } else if (typeof document !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.onload = initBrick;
      script.onerror = () => {
        const el = document.getElementById(containerId);
        if (el) el.innerHTML = `<p style="color:#f87171;text-align:center;padding:16px">${t.cardFormLoadError}</p>`;
      };
      document.head.appendChild(script);
    }

    return () => { unmountCardBrick(); };
  }, [isOpen, isUSD, activeTab, summary.total, userEmail, isCombo, productIds, discountPct, storeId, t, unmountCardBrick, onPaymentComplete]);

  const handlePayStripe = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      let res;
      if (isCombo) {
        res = await api.post('/area-cliente/promo-checkout', {
          product_ids: productIds,
          discount_pct: Number(discountPct),
          ...(storeId ? { store_id: storeId } : {}),
        });
      } else {
        const params = {
          sid: productIds[0],
          base_currency: 'usd',
          from_member_area: '1',
        };
        if (productIds.length > 1) params.orderbumps = productIds.slice(1).join(',');
        if (storeId) params.storeid = storeId;
        if (userEmail) params.email = userEmail;
        res = await api.get('/createStripeLink', { params });
      }
      const url = res.data?.checkout_url;
      if (url) {
        navigateExternal(url);
      } else {
        setErrorMsg(t.stripeUnavailableError);
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.error || t.stripeUnavailableError);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayMercadoPagoLink = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      let res;
      if (isCombo) {
        res = await api.post('/area-cliente/promo-checkout', {
          product_ids: productIds,
          discount_pct: Number(discountPct),
          ...(storeId ? { store_id: storeId } : {}),
        });
      } else {
        const params = new URLSearchParams({ sids: productIds.join(',') });
        if (userEmail) params.set('email', userEmail);
        if (storeId) params.set('storeid', storeId);
        res = await api.get(`/createMLlink_v2?${params}`);
      }
      const url = res.data?.checkout_url;
      if (url) {
        navigateExternal(url);
      } else {
        setErrorMsg(t.noLinkError);
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.error || t.processError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyPix = async () => {
    if (!pixData?.qr_code) return;
    try {
      await navigator.clipboard.writeText(pixData.qr_code);
      setPixCopied(true);
      setPixStatusMsg(t.pixCopiedMsg);
      setTimeout(() => setPixCopied(false), 2500);
    } catch (_) {
      setPixStatusMsg(t.pixCopiedFallback);
    }
  };

  if (!isOpen || !items.length || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose?.(); }}
      role="dialog"
      aria-modal="true"
      aria-label={t.payModalSummaryTitle}
    >
      <div
        className="w-full max-w-md bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-gray-900/80">
          <div>
            <h3 className="text-base font-bold text-white">{t.payModalSummaryTitle}</h3>
            <p className="text-xs text-gray-400">
              {items.length} {t.payModalItemsLabel}
              {isCombo ? ` • -${discountPct}% OFF` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Fechar"
            className="text-gray-400 hover:text-white p-1 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Compact order summary */}
          <div className="rounded-xl border border-white/10 bg-gray-950/70 p-3.5 space-y-2">
            <ul className="space-y-1 max-h-28 overflow-y-auto pr-1">
              {items.map((item) => (
                <li key={item.productid} className="flex items-center justify-between gap-2 text-xs text-gray-300">
                  <span className="truncate">{item.title}</span>
                  <span className="shrink-0 font-medium text-gray-200">
                    {formatCurrency(roundDiscountedItemPrice(item.price, discountPct), activeCurrency, lang)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="pt-2 border-t border-white/10 flex items-baseline justify-between">
              <span className="text-xs text-gray-400">{t.total}</span>
              <div className="flex items-baseline gap-2">
                {summary.savings > 0 && (
                  <span className="text-xs text-gray-500 line-through">
                    {formatCurrency(summary.subtotal, activeCurrency, lang)}
                  </span>
                )}
                <span className="text-lg font-extrabold text-amber-400">
                  {formatCurrency(summary.total, activeCurrency, lang)}
                </span>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="space-y-2">
              <Alert variant="error" message={errorMsg} />
              {!isUSD && activeTab === 'pix' && (
                <button
                  type="button"
                  onClick={requestPix}
                  disabled={submitting}
                  className="w-full rounded-lg border border-white/15 bg-gray-800 hover:bg-gray-700 py-2 text-xs font-semibold text-white transition-colors"
                >
                  {t.tryAgain}
                </button>
              )}
            </div>
          )}

          {isUSD ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handlePayStripe}
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-950 font-bold text-sm py-3.5 px-5 transition-colors disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                <span>{submitting ? t.waitBtn : t.payWithStripeBtn}</span>
              </button>
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>{t.immediateAccess}</span>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* BRL payment tabs */}
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-950 p-1 border border-white/10">
                <button
                  type="button"
                  onClick={() => { setErrorMsg(null); setActiveTab('pix'); }}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
                    activeTab === 'pix'
                      ? 'bg-emerald-500 text-gray-950'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>{t.payModalTabPix}</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setErrorMsg(null); setActiveTab('card'); }}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-colors ${
                    activeTab === 'card'
                      ? 'bg-amber-500 text-gray-950'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>{t.payModalTabCard}</span>
                </button>
              </div>

              {activeTab === 'pix' ? (
                <div className="rounded-xl border border-white/10 bg-gray-900/90 p-4 space-y-3 text-center">
                  {submitting && !pixData ? (
                    <div className="py-8 flex flex-col items-center gap-2 text-gray-300">
                      <Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
                      <p className="text-xs">{t.generatingQRCode}</p>
                    </div>
                  ) : pixData ? (
                    <>
                      {pixData.qr_code_base64 && (
                        <div className="mx-auto inline-block rounded-xl bg-white p-2 border border-emerald-500/40">
                          <img
                            src={pixData.qr_code_base64.startsWith('data:')
                              ? pixData.qr_code_base64
                              : `data:image/png;base64,${pixData.qr_code_base64}`}
                            alt="QR Code PIX"
                            className="w-44 h-44"
                          />
                        </div>
                      )}
                      {pixData.amount != null && (
                        <p className="text-base font-bold text-white">
                          {formatCurrency(pixData.amount, 'BRL', lang)}
                        </p>
                      )}
                      <p className="text-[11px] text-gray-200 break-all bg-gray-950 border border-white/10 rounded-lg p-2.5 text-left">
                        {pixData.qr_code}
                      </p>
                      <button
                        type="button"
                        onClick={handleCopyPix}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-sm py-2.5 transition-colors"
                      >
                        {pixCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        <span>{t.copyPixBtn}</span>
                      </button>
                      {pixStatusMsg && (
                        <p className="text-xs font-medium text-emerald-400">{pixStatusMsg}</p>
                      )}
                    </>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-gray-900/90 p-3 space-y-2">
                  {cardStatus === 'success' && (
                    <p className="text-emerald-400 text-sm text-center font-semibold">{cardStatusMsg}</p>
                  )}
                  {cardStatus === 'pending' && (
                    <p className="text-amber-400 text-sm text-center font-semibold">{cardStatusMsg}</p>
                  )}
                  {cardStatus === 'error' && (
                    <p className="text-red-400 text-sm text-center">{cardStatusMsg}</p>
                  )}
                  <div id="unified-card-brick-container" />
                </div>
              )}

              {/* Discrete MP link fallback */}
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={handlePayMercadoPagoLink}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>{t.payModalOtherMethods}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
