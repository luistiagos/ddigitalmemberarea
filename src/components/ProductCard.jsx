import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Gamepad2, ExternalLink, Lock, Loader2, X, CreditCard, QrCode, Wallet } from 'lucide-react';
import api from '@/services/api';

const CUSTOMER_AREA_REFRESH_KEY = 'customerAreaNeedsRefresh';
const MP_PUBLIC_KEY = 'APP_USR-f344722f-528a-459f-8949-8e50f7db0e03';

function formatBRL(val) {
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Card de produto para a área do cliente.
 * - owned=true  → imagem + "Aqui está o que você comprou, divirta-se!" + botão verde Acessar
 * - owned=false → imagem em cinza com cadeado + badge de preço + botão neon Desbloquear
 *
 * @param {{ product, userEmail, storeId, onPaymentFlowClosed }}
 */
export function ProductCard({ product, userEmail, storeId, onPaymentFlowClosed }) {
  const { productid, title, image, owned, price, relprice, description, deliverlink } = product;
  const displayPrice = price != null ? Number(price) : null;
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixData, setPixData] = useState(null);
  const [pixCopyMsg, setPixCopyMsg] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [paymentModalLoading, setPaymentModalLoading] = useState(false);
  const [paymentActionLabel, setPaymentActionLabel] = useState('');
  const checkoutUrlRef = useRef(null);
  const checkoutUrlPromiseRef = useRef(null);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cardStatus, setCardStatus] = useState('');
  const [cardStatusMsg, setCardStatusMsg] = useState('');
  const mpBricksCtrl = useRef(null);

  // Ensure component is mounted before rendering portals
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Mount / unmount MP CardPayment Brick for card payment
  useEffect(() => {
    if (!cardModalOpen) {
      if (mpBricksCtrl.current) {
        try { mpBricksCtrl.current.unmount(); } catch (_) {}
        mpBricksCtrl.current = null;
      }
      return;
    }
    setCardStatus('');
    setCardStatusMsg('');
    const containerId = `card-brick-product-${productid}`;

    function initBrick() {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '';
      try {
        const mp = new window.MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
        mp.bricks().create('cardPayment', containerId, {
          initialization: { amount: displayPrice ?? 0, payer: { email: userEmail || '' } },
          callbacks: {
            onReady: () => {},
            onSubmit: async (cardData) => {
              setCardStatus('');
              setCardStatusMsg('');
              const body = {
                sids: String(productid),
                token: cardData.token,
                installments: cardData.installments,
                payment_method_id: cardData.payment_method_id,
                email: cardData.payer?.email || userEmail,
                storeid: storeId,
              };
              if (cardData.payer?.identification?.number) {
                body.identification_type = cardData.payer.identification.type || 'CPF';
                body.identification_number = cardData.payer.identification.number;
              }
              try {
                const res = await api.post('/create_card_payment', body);
                const data = res.data;
                if (data.error) {
                  setCardStatus('error');
                  setCardStatusMsg(data.error);
                } else if (data.status === 'approved') {
                  setCardStatus('success');
                  setCardStatusMsg('\u2705 Pagamento aprovado!');
                  if (mpBricksCtrl.current) {
                    try { mpBricksCtrl.current.unmount(); } catch (_) {}
                    mpBricksCtrl.current = null;
                  }
                  const redirectUrl = data.redirect_url;
                  setTimeout(() => {
                    if (redirectUrl) {
                      sessionStorage.setItem(CUSTOMER_AREA_REFRESH_KEY, '1');
                      window.location.href = redirectUrl;
                    } else {
                      setCardModalOpen(false);
                      onPaymentFlowClosed?.();
                    }
                  }, 2000);
                } else if (data.status === 'in_process' || data.status === 'pending') {
                  setCardStatus('pending');
                  setCardStatusMsg('\u23f3 Pagamento em an\u00e1lise. Voc\u00ea receber\u00e1 um e-mail de confirma\u00e7\u00e3o em breve.');
                  setTimeout(() => { setCardModalOpen(false); onPaymentFlowClosed?.(); }, 3000);
                } else {
                  setCardStatus('error');
                  setCardStatusMsg(`Pagamento n\u00e3o aprovado (${data.status_detail || data.status}). Verifique os dados e tente novamente.`);
                }
              } catch {
                setCardStatus('error');
                setCardStatusMsg('Erro ao processar pagamento. Tente novamente.');
              }
            },
            onError: (err) => {
              console.error('ProductCard CardBrick error:', err);
            },
          },
        }).then(ctrl => { mpBricksCtrl.current = ctrl; });
      } catch (e) {
        console.error('ProductCard initBrick error:', e);
        const el = document.getElementById(containerId);
        if (el) el.innerHTML = '<p style="color:#f87171;text-align:center;padding:20px">Erro ao carregar formul\u00e1rio. Use PIX ou Mercado Pago.</p>';
      }
    }

    if (window.MercadoPago) {
      initBrick();
    } else {
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.onload = initBrick;
      script.onerror = () => {
        const el = document.getElementById(containerId);
        if (el) el.innerHTML = '<p style="color:#f87171;text-align:center;padding:20px">N\u00e3o foi poss\u00edvel carregar o formul\u00e1rio. Use PIX ou Mercado Pago.</p>';
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
  }, [cardModalOpen]);

  const getSids = () => String(productid);

  const createCheckoutLink = async () => {
    const params = new URLSearchParams({ sids: getSids() });
    if (userEmail) params.set('email', userEmail);
    if (storeId) params.set('storeid', storeId);
    const res = await api.get(`/createMLlink_v2?${params}`);
    return res.data?.checkout_url || null;
  };

  const ensureCheckoutLink = async () => {
    if (checkoutUrlRef.current) {
      return checkoutUrlRef.current;
    }

    if (!checkoutUrlPromiseRef.current) {
      checkoutUrlPromiseRef.current = createCheckoutLink()
        .then((checkoutUrl) => {
          checkoutUrlRef.current = checkoutUrl;
          return checkoutUrl;
        })
        .finally(() => {
          checkoutUrlPromiseRef.current = null;
        });
    }

    return checkoutUrlPromiseRef.current;
  };

  const openPaymentModal = () => {
    setBuyError(null);
    setPaymentModalOpen(true);
    setPaymentModalLoading(true);
    setPaymentActionLabel('Preparando formas de pagamento...');

    ensureCheckoutLink()
      .catch(() => {
        // O fluxo ainda pode seguir com nova tentativa ao clicar em Cartao/Link.
      })
      .finally(() => {
        setPaymentModalLoading(false);
        setPaymentActionLabel('');
      });
  };

  const handleBuyMercadoPago = async () => {
    setBuying(true);
    setBuyError(null);
    setPaymentModalLoading(true);
    setPaymentActionLabel('Redirecionando para o Mercado Pago...');
    try {
      const checkoutUrl = await ensureCheckoutLink();
      if (checkoutUrl) {
        // Mark that customer area should force a refresh when user returns from external checkout.
        sessionStorage.setItem(CUSTOMER_AREA_REFRESH_KEY, '1');
        window.location.href = checkoutUrl;
      } else {
        checkoutUrlRef.current = null;
        setBuyError('Não foi possível gerar o link. Tente novamente.');
      }
    } catch {
      checkoutUrlRef.current = null;
      setBuyError('Erro ao processar. Tente novamente.');
    } finally {
      setPaymentModalLoading(false);
      setPaymentActionLabel('');
      setBuying(false);
    }
  };

  const handleBuyCard = () => {
    setPaymentModalOpen(false);
    setCardModalOpen(true);
  };

  const closeCardModal = () => {
    setCardModalOpen(false);
    onPaymentFlowClosed?.();
  };

  const handleBuyPix = async () => {
    setBuying(true);
    setBuyError(null);
    setPixCopyMsg('');
    setPaymentModalLoading(true);
    setPaymentActionLabel('Gerando QR Code PIX...');
    try {
      const body = { sids: getSids(), email: userEmail, storeid: storeId };
      const res = await api.post('/create_pix_payment', body);
      if (res.data?.error) {
        setBuyError(res.data.error || 'Erro ao gerar PIX.');
      } else if (res.data?.qr_code) {
        setPaymentModalOpen(false);
        setPixData(res.data);
        setPixModalOpen(true);
      } else {
        setBuyError('Não foi possível gerar o PIX. Tente novamente.');
      }
    } catch {
      setBuyError('Erro ao gerar PIX. Tente novamente.');
    } finally {
      setPaymentModalLoading(false);
      setPaymentActionLabel('');
      setBuying(false);
    }
  };

  const copyPixCode = async () => {
    if (!pixData?.qr_code) return;
    try {
      await navigator.clipboard.writeText(pixData.qr_code);
      setPixCopyMsg('Código PIX copiado!');
    } catch {
      setPixCopyMsg('Não foi possível copiar automaticamente.');
    }
  };

  const closePaymentModal = (shouldRefresh = true) => {
    if (paymentModalLoading || buying) {
      return;
    }

    setPaymentModalOpen(false);
    setPaymentActionLabel('');
    if (shouldRefresh) {
      onPaymentFlowClosed?.();
    }
  };

  const closePixModal = () => {
    setPixModalOpen(false);
    onPaymentFlowClosed?.();
  };

  /* ── Produto adquirido ── */
  if (owned) {
    return (
      <article className="flex flex-col rounded-xl border border-gray-700/60 bg-gray-800/50 overflow-hidden animate-fade-in transition-all duration-200 hover:border-green-500/40 hover:shadow-lg hover:shadow-green-500/5">
        {/* Imagem full-width */}
        <div className="relative w-full h-44 bg-gray-900 overflow-hidden shrink-0">
          {image
            ? <img src={image} alt={title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><Gamepad2 className="h-16 w-16 text-gray-600" /></div>}
          <div className="absolute inset-0 bg-linear-to-t from-gray-900/70 via-transparent to-transparent" />
        </div>

        {/* Conteúdo */}
        <div className="flex flex-col flex-1 p-4 gap-3">
          {/* Título */}
          <h2 className="font-semibold text-white text-sm leading-tight line-clamp-2">{title}</h2>

          {/* Tagline */}
          <p className="text-xs text-gray-400">Aqui está o que você comprou, divirta-se!</p>

          {/* Botão Acessar */}
          <div className="mt-auto">
            {deliverlink ? (
              <a
                href={deliverlink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 justify-center rounded-lg bg-green-500 hover:bg-green-400 active:bg-green-600 text-white font-semibold text-sm py-2.5 px-6 transition-colors w-full"
              >
                <ExternalLink className="h-4 w-4" />
                Acessar
              </a>
            ) : (
              <span className="text-xs text-gray-600 italic">Link de acesso indisponível</span>
            )}
          </div>
        </div>
      </article>
    );
  }

  /* ── Produto não adquirido ── */
  const displayRelPrice = relprice != null ? Number(relprice) : null;
  const discount =
    displayRelPrice && displayPrice && displayRelPrice > displayPrice
      ? Math.round((1 - displayPrice / displayRelPrice) * 100)
      : null;

  return (
    <>
      <article className="flex flex-col rounded-xl border border-gray-700/60 bg-gray-800/50 overflow-hidden animate-fade-in transition-all duration-200 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5">
        {/* Imagem com overlay e cadeado */}
        <div className="relative w-full h-44 bg-gray-900 overflow-hidden shrink-0">
          {image
            ? <img src={image} alt={title} className="w-full h-full object-cover opacity-55" />
            : <div className="w-full h-full flex items-center justify-center"><Gamepad2 className="h-16 w-16 text-gray-600" /></div>}
          {/* Gradiente escuro na base */}
          <div className="absolute inset-0 bg-linear-to-t from-gray-900/70 via-transparent to-transparent" />
          {/* Cadeado central */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock className="h-12 w-12 text-white/75 drop-shadow-lg" />
          </div>
          {/* Badge de desconto */}
          {discount && (
            <span className="absolute top-3 right-3 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-gray-900">
              -{discount}%
            </span>
          )}
        </div>

        {/* Conteúdo textual */}
        <div className="flex flex-col flex-1 p-4 gap-3">
          {/* Título */}
          <h2 className="font-semibold text-white text-sm leading-tight line-clamp-2">{title}</h2>

          {/* Descrição */}
          {description && (
            <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">{description}</p>
          )}

          {/* Preços */}
          {displayPrice != null && (
            <div className="flex items-baseline gap-2 flex-wrap mt-auto">
              {displayRelPrice && displayRelPrice > displayPrice && (
                <span className="text-xs text-gray-500 line-through">{formatBRL(displayRelPrice)}</span>
              )}
              <span className="text-base font-bold text-white">{formatBRL(displayPrice)}</span>
              {discount && (
                <span className="text-xs text-green-400 font-medium">
                  economia {formatBRL(displayRelPrice - displayPrice)}
                </span>
              )}
            </div>
          )}

          {/* Botão */}
          <button
            onClick={openPaymentModal}
            disabled={buying}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-900 font-bold text-sm py-2.5 px-4 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {buying
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Lock className="h-4 w-4" />}
            {buying ? 'Aguarde...' : 'Pagar'}
          </button>
          {buyError && (
            <p className="text-xs text-red-400 text-center mt-1">{buyError}</p>
          )}
        </div>
      </article>

      {isMounted && paymentModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
              <h3 className="text-white font-semibold">Escolha como pagar</h3>
              <button onClick={() => closePaymentModal()} disabled={paymentModalLoading || buying} className="text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {paymentModalLoading ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-gray-700 bg-gray-900/60 px-4 py-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                  <p className="mt-4 text-sm font-medium text-white">{paymentActionLabel || 'Preparando pagamento...'}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {paymentActionLabel === 'Gerando QR Code PIX...'
                      ? 'Estamos preparando o PIX para voce copiar ou escanear.'
                      : 'Isso costuma levar apenas alguns segundos.'}
                  </p>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleBuyMercadoPago}
                    disabled={buying}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-gray-900 font-semibold text-sm py-2.5 px-4 transition-colors disabled:opacity-60"
                  >
                    <Wallet className="h-4 w-4" />
                    Link Mercado Pago
                  </button>

                  <button
                    onClick={handleBuyPix}
                    disabled={buying}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-semibold text-sm py-2.5 px-4 transition-colors disabled:opacity-60"
                  >
                    <QrCode className="h-4 w-4" />
                    PIX
                  </button>

                  <button
                    onClick={handleBuyCard}
                    disabled={buying}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-sm py-2.5 px-4 transition-colors disabled:opacity-60"
                  >
                    <CreditCard className="h-4 w-4" />
                    Cartão
                  </button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {isMounted && cardModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 py-4">
          <div className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 sticky top-0 bg-gray-800 z-10 rounded-t-2xl">
              <h3 className="text-white font-semibold">Pagar com Cartão</h3>
              <button onClick={closeCardModal} aria-label="Fechar" className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              {cardStatus === 'success' && (
                <p className="text-emerald-400 text-sm text-center font-semibold">{cardStatusMsg}</p>
              )}
              {cardStatus === 'pending' && (
                <p className="text-amber-400 text-sm text-center font-semibold">{cardStatusMsg}</p>
              )}
              {cardStatus === 'error' && (
                <p className="text-red-400 text-sm text-center">{cardStatusMsg}</p>
              )}
              <div id={`card-brick-product-${productid}`} />
            </div>
          </div>
        </div>,
        document.body
      )}

      {isMounted && pixModalOpen && pixData && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-900 font-semibold">Pagar com PIX</h3>
              <button onClick={closePixModal} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {pixData.qr_code_base64 && (
              <img
                src={pixData.qr_code_base64.startsWith('data:') ? pixData.qr_code_base64 : `data:image/png;base64,${pixData.qr_code_base64}`}
                alt="QR Code PIX"
                className="mx-auto w-48 h-48 border border-emerald-500 rounded-lg"
              />
            )}

            {pixData.amount != null && (
              <p className="text-center text-gray-900 font-bold text-lg mt-3">{formatBRL(pixData.amount)}</p>
            )}

            <p className="text-[11px] text-gray-600 mt-3 break-all bg-gray-100 rounded-lg p-2.5">
              {pixData.qr_code}
            </p>

            <button
              onClick={copyPixCode}
              className="mt-3 w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-gray-900 font-semibold text-sm py-2.5"
            >
              Copiar código PIX
            </button>
            {pixCopyMsg && <p className="text-xs text-center text-gray-600 mt-2">{pixCopyMsg}</p>}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
