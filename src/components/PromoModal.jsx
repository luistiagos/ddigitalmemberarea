import { useState } from 'react';
import { CreditCard, Loader2, QrCode, Wallet } from 'lucide-react';
import api from '@/services/api';

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
export default function PromoModal({ products, storeId = null, onClose, onAccepted }) {
  const [step, setStep]             = useState('25');
  const [loading, setLoading]       = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('');
  const [error, setError]           = useState('');
  const [choosingMethod, setChoosingMethod] = useState(false); // false = botão único | true = 3 métodos
  const [paymentStep, setPaymentStep] = useState('options'); // 'options' | 'pix'
  const [pixData, setPixData]       = useState(null);
  const [pixCopyMsg, setPixCopyMsg] = useState('');

  const productIds  = products.map((p) => p.productid);
  const total25     = products.reduce((s, p) => s + p.price_25, 0);
  const total50     = products.reduce((s, p) => s + p.price_50, 0);
  const totalFull   = products.reduce((s, p) => s + p.price,    0);

  const fmt = (v) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  async function handleMercadoPago(discountPct) {
    setLoading(true);
    setLoadingLabel('Gerando link de pagamento...');
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

  const is25 = step === '25';
  const discountLabel = is25 ? '25%' : '50%';
  const discountPct   = is25 ? 25 : 50;
  const totalShown    = is25 ? total25 : total50;

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden">

        {/* Header gradient bar */}
        <div className={`h-1.5 w-full ${is25 ? 'bg-linear-to-r from-amber-400 to-orange-500' : 'bg-linear-to-r from-red-500 to-pink-600'}`} />

        <div className="p-6 space-y-5">

          {/* Title */}
          <div className="text-center space-y-1">
            <p className="text-2xl font-bold text-white">
              {is25 ? '🔥 Oferta Exclusiva — Só Agora!' : '⚠️ Último Aviso!'}
            </p>
            <p className="text-sm text-gray-400">
              {is25
                ? `Esta promoção expira quando você fechar esta janela.`
                : `Esta é sua última chance. A oferta desaparece quando você clicar em "Não quero".`}
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

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          {/* CTA buttons */}
          <div className="space-y-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-6 text-center">
                <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
                <p className="mt-3 text-sm font-medium text-white">{loadingLabel || 'Processando...'}</p>
              </div>
            ) : paymentStep === 'pix' && pixData ? (
              /* ── PIX QR Code ── */
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center justify-between w-full">
                  <p className="text-sm font-semibold text-white">Pagar com PIX</p>
                  <button
                    onClick={() => { setPaymentStep('options'); setPixData(null); setChoosingMethod(true); }}
                    className="text-gray-500 hover:text-gray-300 text-xs underline"
                  >
                    Voltar
                  </button>
                </div>
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
              </div>
            ) : choosingMethod ? (
              /* ── 3 métodos (aparece apenas após clicar no botão principal) ── */
              <>
                <p className="text-center text-sm text-gray-400 pb-1">Escolha como pagar</p>

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
                  onClick={() => handleMercadoPago(discountPct)}
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
              </>
            ) : (
              /* ── Botão principal único ── */
              <button
                onClick={() => setChoosingMethod(true)}
                disabled={loading}
                className={`w-full py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50
                  ${is25
                    ? 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600'
                    : 'bg-red-500 hover:bg-red-400 active:bg-red-600'}`}
              >
                {is25
                  ? `🚀 Quero ${discountLabel} de desconto agora!`
                  : `✅ Aceitar ${discountLabel} de desconto`}
              </button>
            )}

            {!loading && !choosingMethod && paymentStep !== 'pix' && (
              <button
                onClick={() => (is25 ? setStep('50') : onClose())}
                disabled={loading}
                className="w-full py-2 rounded-xl text-sm text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
              >
                {is25
                  ? 'Vou perder essa oportunidade'
                  : 'Não, quero mesmo assim perder'}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
