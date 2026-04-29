import { useState, useEffect, useRef } from 'react';
import { CreditCard, Loader2, QrCode, Wallet } from 'lucide-react';
import CardModal from '@/components/ui/CardModal';
import api from '@/services/api';

const MP_PUBLIC_KEY = 'APP_USR-f344722f-528a-459f-8949-8e50f7db0e03';

/**
 * Promotional upsell modal shown in the customer area.
 *
 * Step 1 — 25% off offer.
 * Step 2 — 50% off offer (shown only if step 1 is rejected).
 *
 * Props:
 *   products   — array from /area-cliente/promo  { productid, title, image, price, price_25, price_50 }
 *   onClose    — called when the user rejects both offers
 *   onAccepted — called with the checkout URL after a successful promo checkout
 */
export default function PromoModal({ products, storeId = null, onClose, onPaymentComplete, onAccepted, onShown }) {
  const [step, setStep]             = useState('25');
  const [loading, setLoading]       = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('');
  const [error, setError]           = useState('');
  const [choosingMethod, setChoosingMethod] = useState(false); // false = botão único | true = 3 métodos
  const [paymentStep, setPaymentStep] = useState('options'); // 'options' | 'pix'
  const [pixData, setPixData]       = useState(null);
  const [pixCopyMsg, setPixCopyMsg] = useState('');
  const [cardStatus, setCardStatus] = useState(''); // '' | 'success' | 'pending' | 'error'
  const [cardStatusMsg, setCardStatusMsg] = useState('');
  const mpBricksCtrl = useRef(null);

  // Computed values — need to be declared BEFORE the useEffect that uses them
  const productIds  = products.map((p) => p.productid);
  const total25     = products.reduce((s, p) => s + p.price_25, 0);
  const total50     = products.reduce((s, p) => s + p.price_50, 0);
  const totalFull   = products.reduce((s, p) => s + p.price,    0);
  const is25        = step === '25';
  const discountLabel = is25 ? '25%' : '50%';
  const discountPct   = is25 ? 25 : 50;
  const totalShown    = is25 ? total25 : total50;

  // Notifica o pai que o modal está de fato na tela.
  // onShown é chamado apenas uma vez na montagem — é aqui que o pai
  // deve chamar /area-cliente/promo-seen, garantindo que o registro
  // só é gravado quando o usuário viu o modal.
  useEffect(() => {
    if (onShown) onShown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mount / unmount the MP CardPayment Brick
  useEffect(() => {
    if (paymentStep !== 'card') {
      if (mpBricksCtrl.current) {
        try { mpBricksCtrl.current.unmount(); } catch (_) {}
        mpBricksCtrl.current = null;
      }
      return;
    }

    setCardStatus('');
    setCardStatusMsg('');

    // Guard: never initialise the Brick with amount = 0 — MP returns
    // 'no_payment_method_for_provided_bin' for every BIN when amount is 0.
    if (!totalShown || totalShown <= 0) {
      const el = document.getElementById('promo-card-brick-container');
      if (el) el.innerHTML = '<p style="color:#f87171;text-align:center;padding:20px">Valor inválido. Não é possível processar o pagamento com cartão.</p>';
      return;
    }

    function initBrick() {
      const container = document.getElementById('promo-card-brick-container');
      if (!container) return;
      container.innerHTML = '';
      try {
        const mp = new window.MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
        mp.bricks().create('cardPayment', 'promo-card-brick-container', {
          initialization: { amount: totalShown },
          callbacks: {
            onReady: () => {},
            onSubmit: async (cardData) => {
              setLoading(true);
              setLoadingLabel('Processando pagamento...');
              setCardStatus('');
              setCardStatusMsg('');
              try {
                const body = {
                  product_ids: productIds,
                  discount_pct: discountPct,
                  token: cardData.token,
                  installments: cardData.installments,
                  payment_method_id: cardData.payment_method_id,
                };
                if (cardData.payer?.identification?.number) {
                  body.identification_type = cardData.payer.identification.type || 'CPF';
                  body.identification_number = cardData.payer.identification.number;
                }
                if (storeId != null) body.store_id = storeId;
                const { data } = await api.post('/area-cliente/promo-checkout-card', body);
                if (data.error) {
                  setCardStatus('error');
                  setCardStatusMsg(data.error);
                } else if (data.status === 'approved') {
                  setCardStatus('success');
                  setCardStatusMsg('✅ Pagamento aprovado! Sua compra foi concluída.');
                  if (mpBricksCtrl.current) {
                    try { mpBricksCtrl.current.unmount(); } catch (_) {}
                    mpBricksCtrl.current = null;
                  }
                  setTimeout(() => (onPaymentComplete ?? onClose)(), 2500);
                } else if (data.status === 'in_process' || data.status === 'pending') {
                  setCardStatus('pending');
                  setCardStatusMsg('⏳ Pagamento em análise. Você receberá um e-mail de confirmação em breve.');
                  setTimeout(() => (onPaymentComplete ?? onClose)(), 3000);
                } else {
                  setCardStatus('error');
                  setCardStatusMsg(`Pagamento não aprovado (${data.status_detail || data.status}). Verifique os dados e tente novamente.`);
                }
              } catch {
                setCardStatus('error');
                setCardStatusMsg('Erro ao processar pagamento. Tente novamente.');
              } finally {
                setLoading(false);
                setLoadingLabel('');
              }
            },
            onError: (err) => {
              console.error('PromoModal CardBrick error:', err);
              // Only surface critical errors — 'non_critical' are informational
              // (e.g. BIN lookup during typing) and should not block the user.
              if (err?.type !== 'non_critical') {
                setCardStatus('error');
                setCardStatusMsg('Erro no formulário de cartão. Tente novamente ou use outra forma de pagamento.');
              }
            },
          },
        }).then(ctrl => { mpBricksCtrl.current = ctrl; });
      } catch (e) {
        console.error('PromoModal initBrick error:', e);
        const el = document.getElementById('promo-card-brick-container');
        if (el) el.innerHTML = '<p style="color:#f87171;text-align:center;padding:20px">Erro ao carregar formulário. Use PIX ou Mercado Pago.</p>';
      }
    }

    if (window.MercadoPago) {
      initBrick();
    } else {
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.onload = initBrick;
      script.onerror = () => {
        const el = document.getElementById('promo-card-brick-container');
        if (el) el.innerHTML = '<p style="color:#f87171;text-align:center;padding:20px">Não foi possível carregar o formulário. Use PIX ou Mercado Pago.</p>';
      };
      document.head.appendChild(script);
    }

    return () => {
      if (mpBricksCtrl.current) {
        try { mpBricksCtrl.current.unmount(); } catch (_) {}
        mpBricksCtrl.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentStep, totalShown]);

  const fmt = (v) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  async function handleMercadoPago(discountPct, label = 'Gerando link de pagamento...') {
    setLoading(true);
    setLoadingLabel(label);
    setError('');
    try {
      const body = { product_ids: productIds, discount_pct: discountPct };
      if (storeId != null) body.store_id = storeId;
      const { data } = await api.post('/area-cliente/promo-checkout', body);
      if (data.checkout_url) {
        onAccepted(data.checkout_url);
      } else {
        setError('Não foi possível gerar o link. Tente novamente.');
      }
    } catch {
      setError('Erro ao criar checkout. Tente novamente.');
    } finally {
      setLoading(false);
      setLoadingLabel('');
    }
  }

  async function handlePix(discountPct) {
    setLoading(true);
    setLoadingLabel('Gerando QR Code PIX...');
    setError('');
    setPixCopyMsg('');
    try {
      const body = { product_ids: productIds, discount_pct: discountPct };
      if (storeId != null) body.store_id = storeId;
      const { data } = await api.post('/area-cliente/promo-checkout-pix', body);
      if (data.error) {
        setError(data.error);
      } else if (data.qr_code) {
        setPixData(data);
        setPaymentStep('pix');
      } else {
        setError('Não foi possível gerar o PIX. Tente novamente.');
      }
    } catch {
      setError('Erro ao criar pagamento PIX. Tente novamente.');
    } finally {
      setLoading(false);
      setLoadingLabel('');
    }
  }

  async function copyPixCode() {
    if (!pixData?.qr_code) return;
    try {
      await navigator.clipboard.writeText(pixData.qr_code);
      setPixCopyMsg('Código PIX copiado!');
    } catch {
      setPixCopyMsg('Não foi possível copiar automaticamente.');
    }
  }

  // Compact payment screen (choosing method, PIX QR, or card form)
  const isCompact = choosingMethod || paymentStep === 'pix';

  return (
    <>
    {/* Backdrop */}
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="relative w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl">

        {/* Header gradient bar */}
        <div className={`h-1.5 w-full ${is25 ? 'bg-linear-to-r from-amber-400 to-orange-500' : 'bg-linear-to-r from-red-500 to-pink-600'}`} />

        {isCompact ? (
          /* ── COMPACT PAYMENT VIEW ── */
          <div className="p-5 space-y-4">

            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
                <p className="text-sm font-medium text-white">{loadingLabel || 'Processando...'}</p>
              </div>
            ) : paymentStep === 'pix' && pixData ? (
              /* PIX QR Code */
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-semibold text-white">Pagar com PIX</p>
                {pixData.qr_code_base64 && (
                  <img
                    src={pixData.qr_code_base64.startsWith('data:') ? pixData.qr_code_base64 : `data:image/png;base64,${pixData.qr_code_base64}`}
                    alt="QR Code PIX"
                    className="mx-auto w-44 h-44 border-2 border-emerald-500 rounded-xl"
                  />
                )}
                {pixData.amount != null && (
                  <p className="text-white font-bold text-lg">{fmt(pixData.amount)}</p>
                )}
                <p className="text-[11px] text-gray-400 break-all bg-gray-800 rounded-lg p-2.5 w-full">
                  {pixData.qr_code}
                </p>
                <button
                  onClick={copyPixCode}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-semibold text-sm transition-colors"
                >
                  Copiar código PIX
                </button>
                {pixCopyMsg && (
                  <p className="text-xs text-center text-gray-400">{pixCopyMsg}</p>
                )}
                <button
                  onClick={onPaymentComplete ?? onClose}
                  className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors"
                >
                  ✅ Já paguei
                </button>
                <button
                  onClick={() => { setPaymentStep('options'); setPixData(null); setChoosingMethod(true); }}
                  className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Voltar
                </button>
              </div>
            ) : paymentStep === 'card' ? null : (
              /* 3 payment method buttons */
              <>
                {/* Compact total */}
                <div className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                  <span className="text-gray-400 text-sm">Total com desconto</span>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 line-through">{fmt(totalFull)}</p>
                    <p className={`font-bold text-base ${is25 ? 'text-amber-400' : 'text-red-400'}`}>
                      {fmt(totalShown)}
                    </p>
                  </div>
                </div>

                {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                <p className="text-center text-xs text-gray-400">Escolha como pagar</p>

                <div className="space-y-2">
                  <button
                    onClick={() => handleMercadoPago(discountPct)}
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-bold bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-gray-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Wallet className="h-4 w-4" />
                    Link Mercado Pago
                  </button>

                  <button
                    onClick={() => handlePix(discountPct)}
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-gray-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <QrCode className="h-4 w-4" />
                    PIX
                  </button>

                  <button
                    onClick={() => { setPaymentStep('card'); }}
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-bold bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-600 text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    Cartão
                  </button>

                  <button
                    onClick={() => setChoosingMethod(false)}
                    className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Voltar
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* ── FULL OFFER VIEW ── */
          <div className="p-6 space-y-5">

            {/* Title */}
            <div className="text-center space-y-1">
              <p className="text-2xl font-bold text-white">
                {is25 ? '🔥 Oferta Exclusiva — Só Agora!' : '⚠️ Último Aviso!'}
              </p>
              <p className="text-sm text-gray-400">
                {is25
                  ? 'Esta promoção expira quando você fechar esta janela.'
                  : 'Esta é sua última chance. A oferta desaparece quando você clicar em "Não quero".'}
              </p>
            </div>

            {/* FOMO body */}
            <p className="text-gray-300 text-sm leading-relaxed text-center">
              {is25
                ? `Detectamos que você ainda não possui ${products.length > 1 ? `${products.length} produto(s)` : 'este produto'} da loja. Desbloqueie agora com `
                : `Ok, entendemos que ${fmt(total25)} ainda era muito. Que tal levar tudo por apenas `}
              <span className={`font-bold ${is25 ? 'text-amber-400' : 'text-red-400'}`}>{fmt(totalShown)}</span>
              {is25 ? ` (${discountLabel} de desconto)!` : ` — ${discountLabel} de desconto? Essa é a nossa oferta final.`}
            </p>

            {/* Product list */}
            <ul className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {products.map((p) => {
                const discounted = is25 ? p.price_25 : p.price_50;
                return (
                  <li
                    key={p.productid}
                    className="flex items-center gap-3 bg-gray-800 rounded-xl px-3 py-2"
                  >
                    {p.image && (
                      <img
                        src={p.image}
                        alt={p.title}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <span className="flex-1 text-sm text-white line-clamp-1">{p.title}</span>
                    <span className="text-xs text-gray-500 line-through mr-1">{fmt(p.price)}</span>
                    <span className={`text-sm font-bold ${is25 ? 'text-amber-400' : 'text-red-400'}`}>
                      {fmt(discounted)}
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* Total */}
            <div className="flex justify-between items-center bg-gray-800 rounded-xl px-4 py-3">
              <span className="text-gray-400 text-sm">Total com desconto</span>
              <div className="text-right">
                <p className="text-xs text-gray-500 line-through">{fmt(totalFull)}</p>
                <p className={`font-bold text-lg ${is25 ? 'text-amber-400' : 'text-red-400'}`}>
                  {fmt(totalShown)}
                </p>
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-2">
              <button
                onClick={() => setChoosingMethod(true)}
                className={`w-full py-3 rounded-xl font-bold text-white transition-all
                  ${is25
                    ? 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600'
                    : 'bg-red-500 hover:bg-red-400 active:bg-red-600'}`}
              >
                {is25 ? `🚀 Quero ${discountLabel} de desconto agora!` : `✅ Aceitar ${discountLabel} de desconto`}
              </button>

              <button
                onClick={() => (is25 ? setStep('50') : onClose())}
                className="w-full py-2 rounded-xl text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                {is25 ? 'Vou perder essa oportunidade' : 'Não, quero mesmo assim perder'}
              </button>
            </div>

          </div>
        )}

      </div>
      </div>
    </div>

    {/* Modal de cartão — sobrepõe o PromoModal via portal com z-index 60 */}
    <CardModal
      isOpen={paymentStep === 'card'}
      onClose={() => { setPaymentStep('options'); setChoosingMethod(true); }}
      containerId="promo-card-brick-container"
      status={cardStatus}
      statusMsg={cardStatusMsg}
      zIndex={60}
      footer={
        !loading && cardStatus === '' ? (
          <button
            onClick={() => { setPaymentStep('options'); setChoosingMethod(true); }}
            className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Voltar
          </button>
        ) : null
      }
    />
    </>
  );
}
