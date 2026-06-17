import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Gamepad2, Lock, CheckCircle2, ImageOff, HelpCircle, 
  Send, Star, Copy, Check, Loader2, ChevronDown, ChevronUp, X 
} from 'lucide-react';
import api from '@/services/api';
import { TRANSLATIONS } from './translations';
import './CheckoutPage.css';

// Static FAQ Data
const getFaqItems = (t) => [
  { q: t.faq1q, a: t.faq1a },
  { q: t.faq2q, a: t.faq2a },
  { q: t.faq3q, a: t.faq3a },
  { q: t.faq4q, a: t.faq4a },
  { q: t.faq5q, a: t.faq5a }
];

// Static Testimonials
const getTestimonials = (t) => [
  { name: 'Gabriel S.', stars: 5, text: t.t1 },
  { name: 'Marina A.', stars: 5, text: t.t2 },
  { name: 'Rogério M.', stars: 4, text: t.t3 },
  { name: 'Bianca T.', stars: 5, text: t.t4 },
  { name: 'Angela N.', stars: 5, text: t.t5 },
  { name: 'Carlos E.', stars: 5, text: t.t6 },
  { name: 'Fernanda L.', stars: 5, text: t.t7 },
  { name: 'João P.', stars: 4, text: t.t8 },
  { name: 'Lucas R.', stars: 5, text: t.t9 },
  { name: 'Ana C.', stars: 5, text: t.t10 },
  { name: 'Pedro H.', stars: 5, text: t.t11 },
  { name: 'Mariana S.', stars: 5, text: t.t12 },
  { name: 'Rafael K.', stars: 4, text: t.t13 },
  { name: 'Juliana M.', stars: 5, text: t.t14 },
  { name: 'Bruno V.', stars: 5, text: t.t15 }
];

export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  
  // Extract and sanitize storeId (strip trailing params if user typed ? instead of &)
  const storeIdRaw = searchParams.get('storeid') || searchParams.get('store_id');
  const storeId = storeIdRaw ? storeIdRaw.split('?')[0].split('&')[0] : null;

  // Extract and sanitize langParam (handling potential double-question mark typos)
  let langParam = searchParams.get('lang')?.toLowerCase() || 'ptbr';
  if (langParam === 'ptbr' && window.location.search.includes('lang=')) {
    const match = window.location.search.match(/[?&]lang=([^?&]+)/i);
    if (match) {
      langParam = match[1].toLowerCase();
    }
  }

  const lang = TRANSLATIONS[langParam] ? langParam : 'ptbr';
  const t = TRANSLATIONS[lang];
  const isUSD = lang === 'en' || lang === 'es';

  // Page States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [storeInfo, setStoreInfo] = useState(null);
  const [mainProduct, setMainProduct] = useState(null);
  const [orderBumps, setOrderBumps] = useState([]);
  const [selectedBumps, setSelectedBumps] = useState(new Set());

  // Form States
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [celular, setCelular] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [celularError, setCelularError] = useState(false);

  // Coupon States
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0); // in percent (e.g. 25)
  const [couponStatus, setCouponStatus] = useState('idle'); // 'idle' | 'checking' | 'applied' | 'invalid' | 'error'

  // FAQ Expanded index state
  const [expandedFaq, setExpandedFaq] = useState({});

  // Testimonials slide rotation
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  // Resolve testimonials dynamically: if storeInfo has checkout_testimonials, parse it.
  // Otherwise, fallback to getTestimonials(t).
  let TESTIMONIALS = getTestimonials(t);
  if (storeInfo && storeInfo.checkout_testimonials) {
    try {
      const parsed = JSON.parse(storeInfo.checkout_testimonials);
      if (Array.isArray(parsed) && parsed.length > 0) {
        TESTIMONIALS = parsed;
      }
    } catch (e) {
      console.error("Erro parsing store checkout_testimonials:", e);
    }
  }

  const displayedTestimonials = TESTIMONIALS.slice(testimonialIdx, testimonialIdx + 3);

  // Modal & Payment processing states
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalLoadingMsg, setGlobalLoadingMsg] = useState(t.cardProcessing);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixData, setPixData] = useState(null); // { qr_code, qr_code_base64, amount, payment_id }
  const [pixCopied, setPixCopied] = useState(false);
  const [pixStatusText, setPixStatusText] = useState(t.awaitingPayment);
  const [pixConfirmed, setPixConfirmed] = useState(false);
  
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cardError, setCardError] = useState(null);
  const [cardSuccess, setCardSuccess] = useState(false);
  const cardBrickControllerRef = useRef(null);

  // Polling Pix reference
  const pixPollIntervalRef = useRef(null);

  // Load Montserrat Font dynamically
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
      if (pixPollIntervalRef.current) clearInterval(pixPollIntervalRef.current);
    };
  }, []);

  // Auto rotate testimonials
  useEffect(() => {
    if (TESTIMONIALS.length <= 3) {
      setTestimonialIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setTestimonialIdx((prev) => (prev + 3 >= TESTIMONIALS.length ? 0 : prev + 3));
    }, 5500);
    return () => clearInterval(interval);
  }, [TESTIMONIALS.length]);

  // Fetch Store Packages
  useEffect(() => {
    if (!storeId) {
      setError(t.errInvalidStore);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    api.get(`/store/${storeId}/checkout_info`)
      .then(({ data }) => {
        if (!data || !data.principal) {
          setError(t.errNoProducts);
          return;
        }

        setStoreInfo(data.store);
        setMainProduct(data.principal);
        setOrderBumps(data.bumps || []);
      })
      .catch((err) => {
        console.error('Error fetching store packages:', err);
        setError(t.errFetch);
      })
      .finally(() => setLoading(false));
  }, [storeId]);

  // Validation functions
  const validateEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  const validatePhone = (val) => {
    if (!val) return true; // Optional
    const digits = val.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 12;
  };

  // Mask celular on change
  const handlePhoneChange = (e) => {
    let v = e.target.value;
    const n = v.replace(/\D+/g, '').slice(0, 11);
    if (n.length <= 10) {
      v = n.replace(/(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) => {
        let out = '';
        if (a) out += '(' + a;
        if (a && a.length === 2) out += ') ';
        if (b) out += b;
        if (c) out += '-' + c;
        return out;
      });
    } else {
      v = n.replace(/(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    }
    setCelular(v);
    setCelularError(false);
  };

  // Form submission check
  const checkFormValid = () => {
    let valid = true;
    if (!validateEmail(email)) {
      setEmailError(true);
      const emailInput = document.getElementById('email');
      if (emailInput) {
        emailInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        emailInput.focus();
      }
      valid = false;
    } else if (!isUSD && celular && !validatePhone(celular)) {
      setCelularError(true);
      const celInput = document.getElementById('cel');
      if (celInput) {
        celInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        celInput.focus();
      }
      valid = false;
    }
    return valid;
  };

  // Apply Coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || couponStatus === 'checking') return;
    setCouponStatus('checking');

    try {
      const mainPid = mainProduct.package_id || mainProduct.id;
      const response = await api.get(`/cupom`, {
        params: {
          cupom: couponCode.toUpperCase().trim(),
          productid: mainPid
        }
      });

      const discountVal = Number(response.data);
      if (discountVal > 0) {
        setCouponDiscount(discountVal * 100);
        setCouponStatus('applied');
      } else {
        setCouponDiscount(0);
        setCouponStatus('invalid');
        setTimeout(() => setCouponStatus('idle'), 2500);
      }
    } catch (err) {
      console.error(err);
      setCouponDiscount(0);
      setCouponStatus('error');
      setTimeout(() => setCouponStatus('idle'), 2500);
    }
  };

  // Get active product IDs string (sids)
  const getSelectedSids = () => {
    const mainPid = mainProduct.package_id || mainProduct.id;
    const parts = [mainPid];
    orderBumps.forEach(bump => {
      if (selectedBumps.has(bump.id)) {
        parts.push(bump.package_id || bump.id);
      }
    });
    return parts.join(',');
  };

  // Pricing calculations
  const getMainPrice = () => {
    const base = mainProduct ? (mainProduct.price ?? mainProduct.package_price) : 0;
    return base;
  };

  const getDiscountedMainPrice = () => {
    const base = getMainPrice();
    if (couponDiscount > 0) {
      return Math.round(base * (1 - couponDiscount / 100) * 100) / 100;
    }
    return base;
  };

  const getBumpsTotal = () => {
    let sum = 0;
    orderBumps.forEach(bump => {
      if (selectedBumps.has(bump.id)) {
        let p = bump.price ?? bump.package_price;
        if (couponDiscount > 0) {
          p = p * (1 - couponDiscount / 100);
        }
        sum += p;
      }
    });
    return Math.round(sum * 100) / 100;
  };

  const getCartTotal = () => {
    return Math.round((getDiscountedMainPrice() + getBumpsTotal()) * 100) / 100;
  };

  const getTotalEconomy = () => {
    const originalMain = mainProduct ? (mainProduct.relprice || getMainPrice() * 3) : 0;
    const discountedMain = getDiscountedMainPrice();
    let econ = originalMain - discountedMain;

    orderBumps.forEach(bump => {
      if (selectedBumps.has(bump.id)) {
        const origBump = bump.relprice || (bump.price ?? bump.package_price) * 2;
        let discBump = bump.price ?? bump.package_price;
        if (couponDiscount > 0) {
          discBump = discBump * (1 - couponDiscount / 100);
        }
        econ += (origBump - discBump);
      }
    });

    return Math.round(econ * 100) / 100;
  };

  const toggleBump = (bumpId) => {
    setSelectedBumps(prev => {
      const next = new Set(prev);
      if (next.has(bumpId)) {
        next.delete(bumpId);
      } else {
        next.add(bumpId);
      }
      return next;
    });
  };

  // --- Payment flows ---

  // 1. Mercado Pago Direct Checkout Link Redirect
  const pagarMercadoPago = async () => {
    if (!checkFormValid()) return;

    setGlobalLoading(true);
    setGlobalLoadingMsg(t.redirecting);

    const sids = getSelectedSids();
    const cleanPhone = celular.replace(/\D/g, '');

    try {
      const response = await api.get('/createMLlink_v2', {
        params: {
          storeid: storeId,
          email: email.trim(),
          sids: sids,
          telefone: cleanPhone,
          cupom: couponCode.trim() || undefined
        }
      });

      if (response.data && response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        alert(t.errGenCheckout);
        setGlobalLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert(t.errConn);
      setGlobalLoading(false);
    }
  };

  // 1b. Stripe Payment Link
  const pagarStripe = async () => {
    if (!checkFormValid()) return;

    setGlobalLoading(true);
    setGlobalLoadingMsg(t.redirecting);

    const sids = getSelectedSids();
    const mainPid = mainProduct.package_id || mainProduct.id;
    const cleanPhone = celular.replace(/\D/g, '');

    const bumpIds = [];
    orderBumps.forEach(bump => {
      if (selectedBumps.has(bump.id)) {
        bumpIds.push(bump.package_id || bump.id);
      }
    });
    const orderbumpsStr = bumpIds.join(',');

    try {
      const response = await api.get('/createStripeLink', {
        params: {
          sid: mainPid,
          orderbumps: orderbumpsStr || undefined,
          email: email.trim(),
          telefone: cleanPhone || undefined,
          storeid: storeId,
          cupom: couponCode.trim() || undefined,
          base_currency: 'usd'
        }
      });

      if (response.data && response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        alert(t.errGenCheckout);
        setGlobalLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert(t.errConn);
      setGlobalLoading(false);
    }
  };

  // 2. PIX Modal Flow
  const abrirPixFlow = async () => {
    if (!checkFormValid()) return;

    setGlobalLoading(true);
    setGlobalLoadingMsg(t.generatingPix);

    const sids = getSelectedSids();
    const cleanPhone = celular.replace(/\D/g, '');

    try {
      const response = await api.post('/create_pix_payment', {
        sids,
        email: email.trim(),
        storeid: storeId,
        telefone: cleanPhone,
        cupom: couponCode.trim() || undefined
      });

      const data = response.data;
      if (data.error) {
        alert('Erro: ' + data.error);
        setGlobalLoading(false);
        return;
      }

      setPixData({
        qr_code: data.qr_code,
        qr_code_base64: data.qr_code_base64,
        amount: data.amount,
        payment_id: data.payment_id
      });
      setPixStatusText(t.awaitingPayment);
      setPixConfirmed(false);
      setPixCopied(false);
      setPixModalOpen(true);
      setGlobalLoading(false);

      // Start polling
      startPollingPix(data.payment_id);
    } catch (err) {
      console.error(err);
      alert(t.errPix);
      setGlobalLoading(false);
    }
  };

  const startPollingPix = (paymentId) => {
    if (pixPollIntervalRef.current) clearInterval(pixPollIntervalRef.current);

    pixPollIntervalRef.current = setInterval(async () => {
      try {
        const response = await api.get(`/payment_status`, {
          params: { payment_id: paymentId }
        });
        const d = response.data;

        if (d.status === 'approved') {
          clearInterval(pixPollIntervalRef.current);
          pixPollIntervalRef.current = null;
          setPixConfirmed(true);
          setPixStatusText(t.pixSuccess);
          setTimeout(() => {
            window.location.href = d.redirect_url || 'https://digitalmemberarea.digitalstoregames.com/recuperaracesso/';
          }, 3000);
        } else if (['rejected', 'cancelled', 'expired'].includes(d.status)) {
          clearInterval(pixPollIntervalRef.current);
          pixPollIntervalRef.current = null;
          setPixStatusText(t.pixCancelled);
        }
      } catch (e) {
        // fail silently
      }
    }, 5000);
  };

  const fecharPixModal = () => {
    setPixModalOpen(false);
    if (pixPollIntervalRef.current) {
      clearInterval(pixPollIntervalRef.current);
      pixPollIntervalRef.current = null;
    }
    setPixData(null);
  };

  const copiarPixCode = () => {
    if (!pixData?.qr_code) return;
    navigator.clipboard.writeText(pixData.qr_code).then(() => {
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2000);
    });
  };

  // 3. Card Modal Flow (MP Brick Integration)
  const loadMercadoPagoSDK = () => {
    return new Promise((resolve) => {
      if (window.MercadoPago) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  };

  const abrirCardFlow = async () => {
    if (!checkFormValid()) return;

    setGlobalLoading(true);
    setGlobalLoadingMsg(t.cardFormInit);

    const sdkLoaded = await loadMercadoPagoSDK();
    if (!sdkLoaded) {
      alert(t.errCardLoad);
      setGlobalLoading(false);
      return;
    }

    setCardError(null);
    setCardSuccess(false);
    setCardModalOpen(true);
    setGlobalLoading(false);

    // Give react time to mount container before initializing brick
    setTimeout(() => {
      initCardBrick();
    }, 150);
  };

  const initCardBrick = () => {
    const container = document.getElementById('cardBrickContainer');
    if (!container) return;
    container.innerHTML = '';

    const MP_PUBLIC_KEY = 'APP_USR-f344722f-528a-459f-8949-8e50f7db0e03';
    const amount = getCartTotal();

    try {
      const mp = new window.MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
      const bricksBuilder = mp.bricks();

      bricksBuilder.create('cardPayment', 'cardBrickContainer', {
        initialization: {
          amount: amount,
          payer: { email: email.trim() },
        },
        callbacks: {
          onReady: () => {},
          onSubmit: (cardData) => processCardPayment(cardData),
          onError: (err) => {
            console.error('CardBrick Error:', err);
            setCardError(t.errCardForm);
          }
        }
      }).then(controller => {
        cardBrickControllerRef.current = controller;
      });
    } catch (e) {
      console.error(e);
      setCardError(t.errCardInit);
    }
  };

  const processCardPayment = async (cardData) => {
    setGlobalLoading(true);
    setGlobalLoadingMsg(t.cardProcessing);

    const sids = getSelectedSids();
    const cleanPhone = celular.replace(/\D/g, '');

    const body = {
      sids,
      token: cardData.token,
      installments: cardData.installments,
      payment_method_id: cardData.payment_method_id,
      email: cardData.payer?.email || email.trim(),
      storeid: storeId
    };

    if (cardData.payer?.identification?.number) {
      body.identification_type = cardData.payer.identification.type || 'CPF';
      body.identification_number = cardData.payer.identification.number;
    }
    if (cleanPhone) body.telefone = cleanPhone;
    if (couponCode.trim()) body.cupom = couponCode.trim();

    try {
      const response = await api.post('/create_card_payment', body);
      const data = response.data;

      if (data.error) {
        alert(t.errCardPay + data.error);
        setGlobalLoading(false);
        // Refresh block to let user retry
        if (cardBrickControllerRef.current) {
          try { cardBrickControllerRef.current.unmount(); } catch (_) {}
          cardBrickControllerRef.current = null;
        }
        initCardBrick();
        return;
      }

      if (data.status === 'approved') {
        setCardSuccess(true);
        setCardModalOpen(false);
        setGlobalLoading(true);
        setGlobalLoadingMsg(t.cardApproved);
        setTimeout(() => {
          window.location.href = data.redirect_url || 'https://digitalmemberarea.digitalstoregames.com/recuperaracesso/';
        }, 3000);
      } else if (['in_process', 'pending'].includes(data.status)) {
        alert(t.cardPending);
        setCardModalOpen(false);
        setGlobalLoading(false);
      } else {
        alert(t.errCardDeclined);
        setGlobalLoading(false);
        // Retry
        if (cardBrickControllerRef.current) {
          try { cardBrickControllerRef.current.unmount(); } catch (_) {}
          cardBrickControllerRef.current = null;
        }
        initCardBrick();
      }
    } catch (err) {
      console.error(err);
      alert(t.errCardConn);
      setGlobalLoading(false);
    }
  };

  const fecharCardModal = () => {
    setCardModalOpen(false);
    if (cardBrickControllerRef.current) {
      try { cardBrickControllerRef.current.unmount(); } catch (_) {}
      cardBrickControllerRef.current = null;
    }
    setCardError(null);
  };

  // Toggle FAQ items
  const toggleFaq = (idx) => {
    setExpandedFaq(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  // Bullet formatting for main product feature list
  const getProductBullets = () => {
    if (storeInfo && storeInfo.checkout_features) {
      return storeInfo.checkout_features.split('\n').filter(line => line.trim());
    }
    if (mainProduct && mainProduct.prd_content) {
      return mainProduct.prd_content.split('\n').filter(line => line.trim());
    }
    // Default high converting bullets
    return [
      t.bullet1,
      t.bullet2,
      t.bullet3,
      t.bullet4,
      t.bullet5
    ];
  };

  // Format currency helper
  const fmt = (v) => {
    if (isUSD) {
      return '$' + Number(v).toFixed(2);
    }
    return 'R$ ' + Number(v).toFixed(2).replace('.', ',');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] flex flex-col items-center justify-center p-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
        <p className="font-semibold text-lg">{t.loadingSecure}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] flex flex-col items-center justify-center p-6 text-center" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <X className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">{t.opsProblem}</h2>
        <p className="text-gray-400 max-w-md mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 font-semibold rounded-lg transition-colors"
        >
          Recarregar
        </button>
      </div>
    );
  }

  const basePrice = getMainPrice();
  const discPrice = getDiscountedMainPrice();
  const origPrice = mainProduct.relprice || basePrice * 3;

  return (
    <div className="wrap">
      <header>
        <a href="#" className="logo-custom" style={{ textDecoration: 'none' }}>
          <svg className="logo-icon-brand" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 12h4m-2-2v4M15 13h.01M18 11h.01M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
          </svg>
          <div className="logo-label">
            DIGITAL STORE <span>GAMES</span>
          </div>
        </a>
        <div className="header-secure">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
          </svg>
          <span>{t.secureEnvironment}</span>
        </div>
      </header>

      <div className="layout">
        <section className="card">
          <div className="muted">{t.totalValue} <span className="strike" style={{ color: '#e74c3c' }}>{fmt(origPrice)}</span></div>
          {storeInfo?.checkout_headline_price && (
            <div className="price" id="headlinePrice">{storeInfo.checkout_headline_price}</div>
          )}
          <div className="muted">{t.cardOrCash} <span id="avistaVlr">{fmt(discPrice)}</span> {t.cash}</div>

          <div className="order-card">
            {mainProduct.image ? (
              <img className="order-thumb" src={mainProduct.image} alt={mainProduct.title} fetchPriority="high" />
            ) : (
              <div className="order-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b' }}>
                <ImageOff className="h-10 w-10 text-gray-600" />
              </div>
            )}
            <div className="order-info">
              <h3>{storeInfo?.name || mainProduct?.title}</h3>
              <ul>
                {getProductBullets().map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
            </div>
          </div>

          <form id="checkoutForm" noValidate autoComplete="on" onSubmit={e => e.preventDefault()}>
            {!isUSD && (
              <div className="field">
                <label className="label" htmlFor="nome">{t.fullName}</label>
                <input 
                  className="input" 
                  id="nome" 
                  name="nome" 
                  type="text" 
                  placeholder={t.yourName} 
                  autoComplete="name"
                  inputMode="text" 
                  autoCapitalize="off" 
                  autoCorrect="off" 
                  spellCheck="false" 
                  autoFocus={!isUSD}
                  enterKeyHint="next"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                />
                <div className="assist">{t.optional}</div>
              </div>
            )}
            
            <div className="field">
              <label className="label" htmlFor="email">{t.deliveryEmail}</label>
              <input 
                className={`input ${emailError ? 'is-invalid' : ''}`} 
                id="email" 
                name="email" 
                type="email" 
                placeholder="voce@email.com" 
                required
                autoComplete="email" 
                inputMode="email" 
                aria-describedby="emailErr" 
                autoCapitalize="off" 
                autoCorrect="off"
                spellCheck="false" 
                enterKeyHint="next"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailError(false); }}
                autoFocus={isUSD}
              />
              <div className="error" id="emailErr" role="alert" aria-hidden={!emailError}>{t.invalidEmail}</div>
              <div className="assist">{t.emailAssist}</div>
            </div>

            {!isUSD && (
              <div className="field">
                <label className="label" htmlFor="cel">{t.phone}</label>
                <input 
                  className={`input ${celularError ? 'is-invalid' : ''}`} 
                  id="cel" 
                  name="tel" 
                  type="tel" 
                  placeholder="(11) 99999-9999" 
                  autoComplete="tel"
                  inputMode="numeric" 
                  pattern="[\d\s\-\(\)]{8,}" 
                  enterKeyHint="done" 
                  maxLength="16"
                  value={celular}
                  onChange={handlePhoneChange}
                />
                <div className="error" id="celErr" role="alert" aria-hidden={!celularError}>{t.invalidPhone}</div>
                <div className="assist">{t.phoneAssist}</div>
              </div>
            )}
          </form>

          {orderBumps.length > 0 && (
            <>
              <div className="bump-header">
                <h2 className="bump-header-title">{t.bumpHeaderTitle}</h2>
                <p className="bump-header-sub">{t.bumpHeaderSub}</p>
              </div>

              <div className="bump-stack">
                {orderBumps.map((bump) => {
                  const isSelected = selectedBumps.has(bump.id);
                  const bumpPrice = bump.price ?? bump.package_price;
                  const bumpRelPrice = bump.relprice || bumpPrice * 2;
                  const econPercent = Math.round((1 - (bumpPrice / bumpRelPrice)) * 100);

                  return (
                    <div 
                      key={bump.id} 
                      className={`bump ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleBump(bump.id)}
                    >
                      <div className="bump-tag">-{econPercent}%</div>
                      <div className="bump-body">
                        <div className="bump-main">
                          <span className="bump-pointer">➔</span>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => {}}
                          />
                          {bump.image ? (
                            <img className="bump-thumb" src={bump.image} alt={bump.title || bump.package_title} />
                          ) : (
                            <div className="bump-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b' }}>
                              <ImageOff className="h-6 w-6 text-gray-600" />
                            </div>
                          )}
                          <div>
                            <div className="bump-hero">{bump.title || bump.package_title}</div>
                            <div className="bump-sub">{bump.description || t.bumpDefaultDesc}</div>
                            <div>
                              <span className="bump-strike">{t.from} {fmt(bumpRelPrice)}</span>
                              <span>{t.to} <span className="bump-price">{fmt(bumpPrice)}</span></span>
                              <span className="bump-economy">{econPercent}{t.discount}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="field" style={{ marginTop: '20px' }}>
            <label className="label" htmlFor="cupom">{t.couponLabel}</label>
            <div className="input-group">
              <input 
                className={`input ${couponStatus === 'applied' ? 'is-valid' : couponStatus === 'invalid' ? 'is-invalid' : ''}`} 
                id="cupom" 
                name="cupom" 
                type="text" 
                placeholder={t.couponPlaceholder}
                autoComplete="off" 
                inputMode="text" 
                enterKeyHint="done" 
                maxLength="16"
                value={couponCode}
                onChange={e => { setCouponCode(e.target.value); setCouponStatus('idle'); }}
                disabled={couponStatus === 'checking'}
                style={couponStatus === 'applied' ? { borderColor: '#10b981' } : {}}
              />
              <button 
                type="button" 
                className="btn-apply" 
                onClick={handleApplyCoupon}
                disabled={!couponCode.trim() || couponStatus === 'checking'}
                style={{
                  backgroundColor: couponStatus === 'applied' ? '#10b981' : couponStatus === 'invalid' ? '#ef4444' : '',
                  color: ['applied', 'invalid'].includes(couponStatus) ? '#fff' : ''
                }}
              >
                {couponStatus === 'checking' && t.checking}
                {couponStatus === 'applied' && t.applied}
                {couponStatus === 'invalid' && t.invalid}
                {couponStatus === 'error' && t.error}
                {['idle', 'error'].includes(couponStatus) && t.apply}
              </button>
            </div>
          </div>

          <div className="summary" id="summary" aria-live="polite">
            <h3>{t.summaryTitle}</h3>
            <table className="summary-table" id="summaryTable">
              <thead>
                <tr>
                  <th>{t.product}</th>
                  <th style={{ textAlign: 'right' }}>{t.price}</th>
                </tr>
              </thead>
              <tbody id="summaryBody">
                <tr>
                  <td>
                    <div style={{ fontWeight: 'bold' }}>
                      {mainProduct.title} {t.digitalAccess}
                    </div>
                    <div className="summary-small">
                      <span className="summary-strike">{fmt(origPrice)}</span> ➔ {t.to} <span className="summary-price">{fmt(discPrice)}</span>
                      {couponDiscount > 0 && <span style={{ color: '#16a34a', fontWeight: 'bold', marginLeft: '8px' }}>(-{couponDiscount}%)</span>}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{fmt(discPrice)}</td>
                </tr>
                {orderBumps.map(bump => {
                  if (!selectedBumps.has(bump.id)) return null;
                  const origB = bump.relprice || (bump.price ?? bump.package_price) * 2;
                  let discB = bump.price ?? bump.package_price;
                  if (couponDiscount > 0) discB = discB * (1 - couponDiscount / 100);

                  return (
                    <tr key={bump.id}>
                      <td>
                        <div style={{ fontWeight: 'bold' }}>{bump.title || bump.package_title}</div>
                        <div className="summary-small">
                          <span className="summary-strike">{fmt(origB)}</span> ➔ {t.to} <span className="summary-price">{fmt(discB)}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{fmt(discB)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td>{t.total} <span className="economy" id="totalEconomy">({t.economy} {fmt(getTotalEconomy())})</span></td>
                  <td style={{ textAlign: 'right', color: '#60a5fa' }} id="totalVlr">{fmt(getCartTotal())}</td>
                </tr>
              </tfoot>
            </table>
            <div className="savings-banner" id="savingsBanner" style={{ display: getTotalEconomy() > 0 ? 'block' : 'none' }}>
              🎉 <strong>{t.savingsBanner1_1}</strong> {t.savingsBanner1_2} <strong id="savingsValue">{fmt(getTotalEconomy())}</strong> {t.savingsBanner2}
            </div>
          </div>

          <div className="trust-bar" id="trustBar">
            {t.trustBar}
          </div>

          {/* Moved Desktop Social Proof under the total logic to match original layout conceptually, or leave in checkout footer */}
          <div className="checkout-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="social-proof" style={{ marginBottom: '10px' }}>
              <div className="social-copy" style={{ fontWeight: 'bold', fontSize: '14px' }}>{t.socialProof}</div>
            </div>
            <div className="rating-row" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div className="stars" style={{ display: 'flex', gap: '2px' }}>
                {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}
              </div>
              <div style={{ fontSize: '14px' }}><strong>4,8 / 5</strong> <span className="rating-muted" style={{ color: 'var(--muted)' }}>(12.854 {t.users})</span></div>
            </div>
            
            <div className="trust-under-cta" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px', opacity: 0.7 }}>
              <span>{t.youPayVia}</span>
              {isUSD ? (
                <>
                  <img src="/images/visa.svg" alt="Visa" style={{ height: '20px' }} />
                  <img src="/images/mastercard.webp" alt="Mastercard" style={{ height: '20px' }} />
                  <img src="/images/amex.svg" alt="American Express" style={{ height: '20px' }} />
                  <img src="/images/diners-club.svg" alt="Diners Club" style={{ height: '20px' }} />
                </>
              ) : (
                <>
                  <img src="/images/mercadopago.webp" alt="Mercado Pago" style={{ height: '20px' }} />
                  <img src="/images/pix.svg" alt="Pix" style={{ height: '20px' }} />
                  <img src="/images/visa.svg" alt="Visa" style={{ height: '20px' }} />
                  <img src="/images/mastercard.webp" alt="Mastercard" style={{ height: '20px' }} />
                  <img src="/images/elo.svg" alt="Elo" style={{ height: '20px' }} />
                  <img src="/images/amex.svg" alt="American Express" style={{ height: '20px' }} />
                  <img src="/images/diners-club.svg" alt="Diners Club" style={{ height: '20px' }} />
                  <img src="/images/boleto.webp" alt="Boleto bancário" style={{ height: '20px' }} />
                </>
              )}
            </div>
          </div>

          <div className="mobile-sticky-bar" style={{ marginTop: '30px' }}>
            <div className="micro-guarantee" style={{ display: 'flex', justifyContent: 'center', gap: '10px', fontSize: '12px', color: 'var(--muted)', marginBottom: '20px' }}>
              <span>{t.immediateAccess}</span>
              {!isUSD && (
                <>
                  <span className="sep">•</span>
                  <span>{t.supportWhatsapp}</span>
                </>
              )}
            </div>

            <p className="pay-label">{t.choosePayment}</p>
            {isUSD ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button 
                  id="stripePayBtn" 
                  className="cta-primary" 
                  onClick={pagarStripe} 
                  type="button" 
                  style={{ 
                    background: '#635bff', 
                    boxShadow: '0 8px 18px rgba(99, 91, 255, .22)', 
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Lock className="h-5 w-5" />
                  <span>{t.payButtonStripe}</span>
                </button>
              </div>
            ) : (
              <div className="pay-grid">
                <button id="payBtn" className="pay-btn pay-btn--mp" onClick={pagarMercadoPago} type="button">
                  <img src="/images/mercadopago.webp" alt="" width="26" height="26" style={{ objectFit: 'contain' }} />
                  <span>Mercado Pago</span>
                </button>
                <button id="altPixBtn" className="pay-btn pay-btn--pix" onClick={abrirPixFlow} type="button">
                  <span className="pay-btn__icon-badge">
                    <img src="/images/pix.svg" alt="" width="20" height="20" />
                  </span>
                  <span>PIX</span>
                </button>
                <button id="altCardBtn" className="pay-btn pay-btn--card" onClick={abrirCardFlow} type="button">
                  <span className="pay-btn__title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <path d="M2 10h20" />
                    </svg>
                    {t.creditCard}
                  </span>
                  <span className="pay-btn__brands">
                    <img src="/images/visa.svg" alt="Visa" height="16" />
                    <img src="/images/mastercard.webp" alt="Mastercard" height="16" />
                    <img src="/images/elo.svg" alt="Elo" height="16" />
                    <img src="/images/amex.svg" alt="Amex" height="16" />
                  </span>
                </button>
              </div>
            )}
          </div>
        </section>

        <aside className="side">
          <div className="tcard" id="tcard" style={{ background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)', padding: '16px', marginBottom: '16px' }}>
            <h3 className="t-title" style={{ margin: '0 0 16px', fontSize: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>{t.whatClientsSay}</h3>
            <div id="tlist" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {displayedTestimonials.map((item, idx) => {
                const initial = (item.name || '?').charAt(0).toUpperCase();
                const colors = ['#eab308', '#22c55e', '#3b82f6', '#f97316', '#a855f7', '#ec4899'];
                const bgColor = colors[(item.name || '?').charCodeAt(0) % colors.length];
                const starsCount = Math.min(5, Math.max(1, Number(item.stars) || 5));

                return (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                        {initial}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{item.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{t.daysAgo}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                      {[...Array(starsCount)].map((_, i) => <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />)}
                      <CheckCircle2 className="h-3 w-3 fill-green-500 text-[var(--card)]" style={{ marginLeft: '4px' }} />
                    </div>
                    <div style={{ fontSize: '13px', color: '#e2e8f0' }}>{item.text}</div>
                  </div>
                );
              })}
            </div>
            <div className="t-footer" style={{ textAlign: 'center', fontSize: '11px', color: 'var(--muted)', marginTop: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Depoimentos verificados
            </div>
          </div>

          <div className="faq" id="checkoutFAQ" aria-label="Perguntas frequentes" style={{ background: 'var(--card)', borderRadius: '14px', border: '1px solid var(--border)', padding: '16px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>{t.faqTitle}</h3>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {getFaqItems(t).map((item, idx) => {
                const isOpen = !!expandedFaq[idx];
                return (
                  <div key={idx} style={{ borderBottom: idx < getFaqItems(t).length - 1 ? '1px solid var(--border)' : 'none', padding: '10px 0' }}>
                    <button 
                      onClick={() => toggleFaq(idx)}
                      style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', color: 'var(--text)', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                    >
                      <span>{item.q}</span>
                      {isOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                    </button>
                    {isOpen && (
                      <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--muted)', lineHeight: '1.4' }}>
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      <footer className="trust-footer" style={{ marginTop: '40px', borderTop: '1px solid var(--border)', paddingTop: '24px', textAlign: 'center' }}>
        <div className="footer-contacts" style={{ marginBottom: '20px', fontSize: '0.8rem', opacity: 0.8, display: 'flex', justifyContent: 'center', gap: '15px' }}>
          <a href="mailto:contato@digitalstoregames.com" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HelpCircle className="h-4 w-4" /> Email
          </a>
          {!isUSD && (
            <a href="https://wa.me/5541996260115" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Send className="h-4 w-4" /> WhatsApp
            </a>
          )}
        </div>
        
        {!isUSD && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <a href="https://www.siteconfiavel.com.br/site/digitalstoregames-com" target="_blank" rel="noopener noreferrer">
              <img src="/images/trust-seals/siteconfiavel.webp" className="trust-seal" alt="Site Confiável" loading="lazy" style={{ height: '40px', borderRadius: '4px' }} />
            </a>
            <a href="https://www.websiteplanet.com/pt-br/webtools/ssl-checker/?url=digitalstoregames.com" target="_blank" rel="noopener noreferrer">
              <img src="/images/trust-seals/ssl.webp" className="trust-seal" alt="SSL Seguro" loading="lazy" style={{ height: '40px', borderRadius: '4px' }} />
            </a>
            <a href="https://www.mercadopago.com.br/ajuda/23185" target="_blank" rel="noopener noreferrer">
              <img src="/images/trust-seals/mercadopagogarantia.webp" className="trust-seal" alt="Mercado Pago Garantia" loading="lazy" style={{ height: '40px', borderRadius: '4px' }} />
            </a>
          </div>
        )}
      </footer>

      {/* WhatsApp Floating Button */}
      {!isUSD && (
        <a href={`https://api.whatsapp.com/send?phone=5541996260115&text=${encodeURIComponent(storeInfo?.checkout_whatsapp_text || t.wppDefaultText)}`} className="whatsapp-float" target="_blank" rel="noopener noreferrer" aria-label="Fale conosco no WhatsApp">
          <span className="whatsapp-tooltip">{t.helpNeeded}</span>
          <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
        </a>
      )}

      {/* Global Spinner Overlay */}
      {globalLoading && (
        <div style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(255, 255, 255, 0.9)', zIndex: 9999, justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
          <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #009EE3', borderRadius: '50%', width: '50px', height: '50px', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ marginTop: '15px', fontWeight: 600, color: '#333' }}>{globalLoadingMsg}</p>
        </div>
      )}

      {/* PIX Payment Modal */}
      {pixModalOpen && pixData && (
        <div role="dialog" aria-modal="true" aria-label="Pagar com PIX" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 10001, alignItems: 'center', justifyContent: 'center', overflowY: 'auto' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px 24px', maxWidth: '400px', width: '90%', margin: '20px auto', textAlign: 'center', fontFamily: "'Montserrat', sans-serif" }}>
            <h2 style={{ margin: '0 0 4px', color: '#00b04a', fontSize: '1.4rem' }}>{t.payWithPix}</h2>
            <p style={{ color: '#555', fontSize: '0.85rem', margin: '0 0 18px' }}>{t.scanQr}</p>
            {pixData.qr_code_base64 && (
              <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code PIX" style={{ maxWidth: '200px', border: '4px solid #00b04a', borderRadius: '10px', display: 'block', margin: '0 auto' }} />
            )}
            <p style={{ fontWeight: 700, fontSize: '1.2rem', color: '#222', margin: '12px 0 6px' }}>{fmt(pixData.amount)}</p>
            <p style={{ fontSize: '0.72rem', color: '#999', wordBreak: 'break-all', fontFamily: 'monospace', background: '#f7f7f7', borderRadius: '6px', padding: '8px', margin: '0 0 14px', lineHeight: '1.4' }}>
              {pixData.qr_code}
            </p>
            <button onClick={copiarPixCode} style={{ width: '100%', padding: '13px', background: '#00b04a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}>
              {pixCopied ? t.copied : t.copyPix}
            </button>
            <div style={{ marginTop: '14px', fontSize: '0.88rem', color: '#666', minHeight: '24px' }}>
              {pixConfirmed ? (
                <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Pagamento confirmado! Redirecionando...</span>
              ) : (
                <span>{pixStatusText}</span>
              )}
            </div>
            <button onClick={fecharPixModal} style={{ marginTop: '10px', padding: '8px 18px', background: '#eee', color: '#444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontFamily: "'Montserrat', sans-serif" }}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Card Payment Modal */}
      {cardModalOpen && (
        <div role="dialog" aria-modal="true" aria-label="Pagar com cartão" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 10001, alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '16px 0' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px 24px', maxWidth: '440px', width: '90%', margin: 'auto', fontFamily: "'Montserrat', sans-serif", maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', position: 'sticky', top: 0, background: '#fff', paddingBottom: '8px', borderBottom: '1px solid #f0f0f0', zIndex: 1 }}>
              <h2 style={{ margin: 0, color: '#222', fontSize: '1.1rem' }}>{t.payWithCard}</h2>
              <button onClick={fecharCardModal} aria-label="Fechar" style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#888', lineHeight: 1, padding: '4px 8px' }}>✕</button>
            </div>
            {cardError && <div style={{ color: '#ef4444', marginBottom: '10px', fontSize: '0.9rem', fontWeight: 'bold' }}>{cardError}</div>}
            <div id="cardBrickContainer"></div>
            {cardSuccess && <div style={{ color: '#16a34a', marginTop: '10px', fontWeight: 'bold', textAlign: 'center' }}>Pagamento aprovado! Redirecionando...</div>}
          </div>
        </div>
      )}
    </div>
  );
}
