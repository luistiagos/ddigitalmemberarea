import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Gamepad2, Lock, CheckCircle2, ImageOff, HelpCircle, 
  Send, Star, Copy, Check, Loader2, ChevronDown, ChevronUp, X 
} from 'lucide-react';
import api from '@/services/api';

// Static FAQ Data
const FAQ_ITEMS = [
  {
    q: 'Como recebo o acesso?',
    a: 'Logo após o pagamento, o acesso é enviado para o seu e-mail. A liberação é imediata.'
  },
  {
    q: 'Tem suporte, caso eu precise?',
    a: 'Sim. Caso precise de ajuda, nosso suporte é feito diretamente pelo WhatsApp.'
  },
  {
    q: 'E se eu não gostar?',
    a: 'Você tem 30 dias de garantia para solicitar reembolso sem burocracia.'
  },
  {
    q: 'É seguro?',
    a: 'Sim. O pagamento é processado pelo Mercado Pago. Toda a compra é coberta pelo programa de Compra Garantida do Mercado Pago.'
  },
  {
    q: 'Quanto tempo para receber o produto?',
    a: 'Depois que o pagamento for confirmado, o produto será enviado para o seu e-mail.'
  }
];

// Static Testimonials
const TESTIMONIALS = [
  { name: 'Gabriel S.', stars: 5, text: 'Recebi tudo certinho e o tutorial ajudou muito. Valeu cada centavo!' },
  { name: 'Marina A.', stars: 5, text: 'Instalação rápida no notebook, catálogo enorme. Recomendo!' },
  { name: 'Rogério M.', stars: 4, text: 'Suporte pelo Whats funcionou de primeira. Ótimo custo-benefício.' },
  { name: 'Bianca T.', stars: 5, text: 'Comprei e em menos de 5 minutos já estava jogando. Sensacional!' },
  { name: 'Angela N.', stars: 5, text: 'A parte do Switch com DLCs é top! Conteúdo atualizado.' },
  { name: 'Carlos E.', stars: 5, text: 'Muito bom, revivi minha infância com o PS1.' },
  { name: 'Fernanda L.', stars: 5, text: 'Fácil de instalar e roda liso no meu PC antigo.' },
  { name: 'João P.', stars: 4, text: 'Bastante jogo, demorei pra escolher o que jogar kkk.' },
  { name: 'Lucas R.', stars: 5, text: 'O suporte me ajudou a configurar o controle. Nota 10.' },
  { name: 'Ana C.', stars: 5, text: 'Adorei os jogos de Super Nintendo, nostálgico demais.' },
  { name: 'Pedro H.', stars: 5, text: 'Entrega imediata mesmo, paguei e chegou no email.' },
  { name: 'Mariana S.', stars: 5, text: 'Tudo organizado, pastas separadas por console.' },
  { name: 'Rafael K.', stars: 4, text: 'Recomendo, era o que eu esperava.' },
  { name: 'Juliana M.', stars: 5, text: 'Comprei pro meu filho e ele adorou.' },
  { name: 'Bruno V.', stars: 5, text: 'Melhor pack que já comprei, sem vírus e sem enrolação.' }
];

export function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeid') || searchParams.get('store_id');

  // Page States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
  const displayedTestimonials = TESTIMONIALS.slice(testimonialIdx, testimonialIdx + 3);

  // Modal & Payment processing states
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalLoadingMsg, setGlobalLoadingMsg] = useState('Processando seu pagamento...');
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixData, setPixData] = useState(null); // { qr_code, qr_code_base64, amount, payment_id }
  const [pixCopied, setPixCopied] = useState(false);
  const [pixStatusText, setPixStatusText] = useState('Aguardando pagamento...');
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

    // Auto rotate testimonials
    const interval = setInterval(() => {
      setTestimonialIdx((prev) => (prev + 3 >= TESTIMONIALS.length ? 0 : prev + 3));
    }, 5500);

    return () => {
      document.head.removeChild(link);
      clearInterval(interval);
      if (pixPollIntervalRef.current) clearInterval(pixPollIntervalRef.current);
    };
  }, []);

  // Fetch Store Packages
  useEffect(() => {
    if (!storeId) {
      setError('ID de loja inválido ou não fornecido.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    api.get(`/store/${storeId}/packages`, { params: { active_only: true } })
      .then(({ data }) => {
        if (!data || data.length === 0) {
          setError('Nenhum produto cadastrado para esta loja.');
          return;
        }

        // The first package from API should be the principal package based on sorting
        const principal = data.find(p => p.principal === 1) || data[0];
        const bumps = data.filter(p => p.id !== principal.id);

        setMainProduct(principal);
        setOrderBumps(bumps);
      })
      .catch((err) => {
        console.error('Error fetching store packages:', err);
        setError('Erro ao carregar dados da loja. Verifique sua conexão.');
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
      valid = false;
    }
    if (celular && !validatePhone(celular)) {
      setCelularError(true);
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
    setGlobalLoadingMsg('Redirecionando para o Mercado Pago...');

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
        alert('Erro ao gerar checkout do Mercado Pago. Tente outro método.');
        setGlobalLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao conectar com o serviço de pagamento. Tente novamente.');
      setGlobalLoading(false);
    }
  };

  // 2. PIX Modal Flow
  const abrirPixFlow = async () => {
    if (!checkFormValid()) return;

    setGlobalLoading(true);
    setGlobalLoadingMsg('Gerando QR Code PIX...');

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
      setPixStatusText('Aguardando pagamento...');
      setPixConfirmed(false);
      setPixCopied(false);
      setPixModalOpen(true);
      setGlobalLoading(false);

      // Start polling
      startPollingPix(data.payment_id);
    } catch (err) {
      console.error(err);
      alert('Erro ao processar pagamento via PIX. Tente novamente.');
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
          setPixStatusText('Pagamento confirmado com sucesso!');
          setTimeout(() => {
            window.location.href = d.redirect_url || 'https://digitalmemberarea.digitalstoregames.com/recuperaracesso/';
          }, 3000);
        } else if (['rejected', 'cancelled', 'expired'].includes(d.status)) {
          clearInterval(pixPollIntervalRef.current);
          pixPollIntervalRef.current = null;
          setPixStatusText('Pagamento cancelado ou expirado. Tente novamente.');
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
    setGlobalLoadingMsg('Iniciando formulário de cartão seguro...');

    const sdkLoaded = await loadMercadoPagoSDK();
    if (!sdkLoaded) {
      alert('Não foi possível carregar o formulário do Mercado Pago. Tente novamente.');
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
            setCardError('Ocorreu um erro no formulário. Tente novamente.');
          }
        }
      }).then(controller => {
        cardBrickControllerRef.current = controller;
      });
    } catch (e) {
      console.error(e);
      setCardError('Erro ao inicializar formulário. Tente outro método.');
    }
  };

  const processCardPayment = async (cardData) => {
    setGlobalLoading(true);
    setGlobalLoadingMsg('Processando pagamento com cartão...');

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
        alert('Erro no pagamento: ' + data.error);
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
        setGlobalLoadingMsg('Pagamento Aprovado! Redirecionando...');
        setTimeout(() => {
          window.location.href = data.redirect_url || 'https://digitalmemberarea.digitalstoregames.com/recuperaracesso/';
        }, 3000);
      } else if (['in_process', 'pending'].includes(data.status)) {
        alert('Seu pagamento está em análise pelo Mercado Pago. Você receberá a confirmação por e-mail.');
        setCardModalOpen(false);
        setGlobalLoading(false);
      } else {
        alert('Pagamento não aprovado. Verifique os dados do cartão e tente novamente.');
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
      alert('Erro de conexão ao processar cartão. Tente novamente.');
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
    if (mainProduct && mainProduct.prd_content) {
      return mainProduct.prd_content.split('\n').filter(line => line.trim());
    }
    // Default high converting bullets
    return [
      'Acesso imediato e vitalício',
      'Catálogo completo incluso',
      'Download ilimitado e sem limites',
      'Atualizações gratuitas constantes',
      'Tutorial passo a passo em vídeo'
    ];
  };

  // Format currency helper
  const fmt = (v) => {
    return 'R$ ' + Number(v).toFixed(2).replace('.', ',');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] flex flex-col items-center justify-center p-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
        <p className="font-semibold text-lg">Carregando dados de checkout seguro...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] flex flex-col items-center justify-center p-6 text-center" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        <X className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Ops! Ocorreu um problema</h2>
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
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] font-['Montserrat'] antialiased pb-20 select-none">
      
      {/* Dynamic styles to inject to page */}
      <style dangerouslySetInnerHTML={{ __html: `
        .strike {
          text-decoration: line-through;
          text-decoration-color: #ef4444;
        }
        .whatsapp-float {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background-color: #25d366;
          color: white;
          width: 52px;
          height: 52px;
          border-radius: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          z-index: 100;
          transition: all 0.3s ease;
        }
        .whatsapp-float:hover {
          transform: scale(1.08);
          background-color: #20ba5a;
        }
        .whatsapp-tooltip {
          position: absolute;
          right: 65px;
          background-color: #1e293b;
          border: 1px solid #334155;
          color: #f8fafc;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
        .whatsapp-float:hover .whatsapp-tooltip {
          opacity: 1;
        }
      `}} />

      <div className="max-w-[1180px] mx-auto pt-6 px-4 md:px-6">
        
        {/* Header */}
        <header className="flex flex-row items-center justify-between gap-4 mb-6 px-1">
          <a href="#" className="flex items-center gap-2 group text-decoration-none">
            <Gamepad2 className="h-8 w-8 text-blue-500 group-hover:scale-105 transition-transform" />
            <div className="text-white font-extrabold text-sm md:text-base tracking-wider">
              DIGITAL STORE <span className="text-blue-500">GAMES</span>
            </div>
          </a>
          <div className="flex items-center gap-1.5 text-[#10b981] font-semibold text-xs md:text-sm bg-[#10b981]/10 px-3 py-1.5 rounded-full">
            <Lock className="h-3.5 w-3.5" />
            <span>Ambiente Seguro</span>
          </div>
        </header>

        {/* Layout: Main column & Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-[18px] items-start">
          
          {/* Main Checkout Section */}
          <section className="bg-[#1e293b] border border-[#334155] rounded-[14px] p-4 md:p-6 shadow-xl">
            
            {/* Header Pricing summary */}
            <div className="mb-4">
              <div className="text-gray-400 text-xs font-semibold tracking-wider">
                VALOR TOTAL (COM BÔNUS): <span className="strike text-red-500 font-bold ml-1">{fmt(origPrice)}</span>
              </div>
              <div className="text-3xl md:text-4xl font-extrabold text-white my-1">
                5 × {fmt(discPrice / 5)}
              </div>
              <div className="text-gray-400 text-sm font-medium">
                No Cartão ou <span className="text-white font-bold">{fmt(discPrice)}</span> à vista
              </div>
            </div>

            {/* Main Product Order Card */}
            <div className="flex gap-4 bg-[#1e293b] border border-[#334155] rounded-[12px] p-4 my-4 flex-col sm:flex-row items-start sm:items-center">
              {mainProduct.image ? (
                <img 
                  className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-[10px] border border-[#334155] shrink-0 self-center sm:self-auto" 
                  src={mainProduct.image} 
                  alt={mainProduct.title} 
                />
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[10px] bg-gray-800 border border-[#334155] flex items-center justify-center shrink-0 self-center sm:self-auto">
                  <ImageOff className="h-10 w-10 text-gray-600" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-white font-bold text-base md:text-lg mb-2 leading-tight">
                  {mainProduct.title} (Acesso Digital)
                </h3>
                <ul className="text-gray-400 text-xs md:text-sm space-y-1 list-disc pl-4">
                  {getProductBullets().map((bullet, i) => (
                    <li key={i}>{bullet}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Checkout Form */}
            <form onSubmit={e => e.preventDefault()} className="space-y-4" noValidate>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-white text-xs md:text-sm font-semibold" htmlFor="nome">Nome Completo</label>
                <input 
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-[10px] p-3 text-white text-sm md:text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" 
                  id="nome" 
                  type="text" 
                  placeholder="Seu nome" 
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                />
                <span className="text-gray-500 text-[10px] md:text-xs">Opcional</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-white text-xs md:text-sm font-semibold" htmlFor="email">E-mail para entrega</label>
                <input 
                  className={`w-full bg-[#0f172a] border rounded-[10px] p-3 text-white text-sm md:text-base focus:outline-none ${
                    emailError 
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500/20' 
                      : 'border-[#334155] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`} 
                  id="email" 
                  type="email" 
                  placeholder="voce@email.com" 
                  required
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError(false); }}
                />
                {emailError && (
                  <span className="text-red-500 text-xs font-semibold">E-mail inválido. Ex: nome@email.com</span>
                )}
                <span className="text-gray-500 text-[10px] md:text-xs">Importante: verifique se digitou o e-mail corretamente para receber o acesso.</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-white text-xs md:text-sm font-semibold" htmlFor="cel">Celular com DDD (opcional)</label>
                <input 
                  className={`w-full bg-[#0f172a] border rounded-[10px] p-3 text-white text-sm md:text-base focus:outline-none ${
                    celularError 
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500/20' 
                      : 'border-[#334155] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`} 
                  id="cel" 
                  type="tel" 
                  placeholder="(11) 99999-9999" 
                  value={celular}
                  onChange={handlePhoneChange}
                />
                {celularError && (
                  <span className="text-red-500 text-xs font-semibold">Celular inválido. Use um formato como (11) 99999-9999</span>
                )}
                <span className="text-gray-500 text-[10px] md:text-xs">Usado para suporte rápido via WhatsApp e rastreamento da entrega.</span>
              </div>

            </form>

            {/* Order Bumps stack */}
            {orderBumps.length > 0 && (
              <div className="mt-8 mb-6">
                <div className="bg-[#0f172a] border border-[#334155] rounded-[12px] p-3 mb-4 text-center">
                  <h4 className="text-blue-400 font-extrabold text-sm md:text-base leading-tight">
                    Aproveite também — extras adicionais com preço especial
                  </h4>
                  <p className="text-gray-400 text-xs mt-1 font-medium">Esta oferta única expira ao sair desta página</p>
                </div>
                
                <div className="grid gap-3">
                  {orderBumps.map((bump) => {
                    const isSelected = selectedBumps.has(bump.id);
                    const bumpPrice = bump.price ?? bump.package_price;
                    const bumpRelPrice = bump.relprice || bumpPrice * 2;
                    const econPercent = Math.round((1 - (bumpPrice / bumpRelPrice)) * 100);

                    return (
                      <div 
                        key={bump.id}
                        onClick={() => toggleBump(bump.id)}
                        className={`relative rounded-xl border p-4 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-500/10 shadow-lg scale-[1.01]' 
                            : 'border-[#334155] bg-gray-800/40 hover:border-gray-500'
                        }`}
                      >
                        <div className="absolute top-[-10px] right-3 bg-blue-600 text-white font-extrabold text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Recomendado
                        </div>

                        <div className="flex gap-3 items-start md:items-center flex-col sm:flex-row mt-1">
                          
                          <div className="flex items-center gap-3 shrink-0 self-stretch sm:self-auto justify-between sm:justify-start">
                            <span className="text-orange-500 font-black text-lg animate-pulse">➔</span>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={() => {}} // Handle on parent div click
                              className="w-5 h-5 accent-blue-500 cursor-pointer"
                            />
                            {bump.image ? (
                              <img 
                                src={bump.image} 
                                alt={bump.title || bump.package_title} 
                                className="w-14 h-14 rounded-lg object-contain border border-[#334155] bg-[#0f172a]" 
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-gray-800 border border-[#334155] flex items-center justify-center">
                                <ImageOff className="h-5 w-5 text-gray-600" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1">
                            <h5 className="text-white font-bold text-sm md:text-base leading-snug">
                              {bump.title || bump.package_title}
                            </h5>
                            <p className="text-gray-400 text-[11px] md:text-xs mt-1 leading-snug">
                              {bump.description || 'Adicione este item extra ao seu pacote com desconto exclusivo.'}
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap mt-2">
                              <span className="text-gray-500 text-xs strike">{fmt(bumpRelPrice)}</span>
                              <span className="text-blue-400 font-extrabold text-sm">{fmt(bumpPrice)}</span>
                              <span className="bg-blue-500/20 text-blue-300 font-bold text-[10px] px-2 py-0.5 rounded-full">
                                {econPercent}% de desconto
                              </span>
                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Coupon Code Section */}
            <div className="mt-6 mb-4 flex flex-col gap-1.5">
              <label className="text-white text-xs md:text-sm font-semibold" htmlFor="cupom">
                Cupom de desconto (opcional)
              </label>
              <div className="flex gap-2">
                <input 
                  className={`flex-1 bg-[#0f172a] border rounded-[10px] p-3 text-white text-sm md:text-base focus:outline-none ${
                    couponStatus === 'applied' 
                      ? 'border-green-500' 
                      : couponStatus === 'invalid' 
                      ? 'border-red-500' 
                      : 'border-[#334155] focus:border-blue-500'
                  }`} 
                  id="cupom" 
                  type="text" 
                  placeholder="Código do cupom" 
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value); setCouponStatus('idle'); }}
                  disabled={couponStatus === 'checking'}
                />
                <button 
                  type="button" 
                  onClick={handleApplyCoupon}
                  disabled={!couponCode.trim() || couponStatus === 'checking'}
                  className={`px-5 rounded-[10px] font-semibold text-xs md:text-sm transition-all duration-200 ${
                    couponStatus === 'applied' 
                      ? 'bg-green-600 hover:bg-green-500 text-white' 
                      : couponStatus === 'invalid' 
                      ? 'bg-red-600 hover:bg-red-500 text-white' 
                      : 'bg-[#0f172a] border border-[#334155] text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {couponStatus === 'checking' && 'Verificando...'}
                  {couponStatus === 'applied' && 'Aplicado!'}
                  {couponStatus === 'invalid' && 'Inválido'}
                  {couponStatus === 'error' && 'Erro'}
                  {['idle', 'error'].includes(couponStatus) && 'Aplicar'}
                </button>
              </div>
            </div>

            {/* Order Summary details */}
            <div className="mt-6 border border-[#334155] rounded-[12px] bg-[#1e293b]/70 overflow-hidden shadow-inner">
              <h4 className="m-0 p-3 bg-[#0f172a] border-b border-[#334155] text-white font-bold text-sm">
                Detalhes do pedido
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-[#334155] bg-gray-800/40 text-gray-400">
                      <th className="p-3">Produto</th>
                      <th className="p-3 text-right">Preço</th>
                    </tr>
                  </thead>
                  <tbody>
                    
                    {/* Main package row */}
                    <tr className="border-b border-[#334155]">
                      <td className="p-3">
                        <div className="font-semibold text-white">
                          {mainProduct.title} (Acesso Digital)
                          {couponDiscount > 0 && (
                            <span className="ml-2 bg-green-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                              -{couponDiscount}% OFF
                            </span>
                          )}
                        </div>
                        <div className="text-gray-500 text-[10px] md:text-xs mt-1">
                          <span className="strike mr-1">de {fmt(origPrice)}</span> 
                          ➔ por <span className="text-white font-semibold">{fmt(discPrice)}</span>
                          <span className="text-green-500 font-bold ml-1">• Economia {fmt(origPrice - discPrice)}</span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-semibold text-white vertical-align-top">
                        {fmt(discPrice)}
                      </td>
                    </tr>

                    {/* Selected order bumps rows */}
                    {orderBumps.map(bump => {
                      if (!selectedBumps.has(bump.id)) return null;
                      const origB = bump.relprice || (bump.price ?? bump.package_price) * 2;
                      let discB = bump.price ?? bump.package_price;
                      if (couponDiscount > 0) {
                        discB = discB * (1 - couponDiscount / 100);
                      }

                      return (
                        <tr key={bump.id} className="border-b border-[#334155]">
                          <td className="p-3">
                            <div className="font-semibold text-white">
                              {bump.title || bump.package_title}
                              {couponDiscount > 0 && (
                                <span className="ml-2 bg-green-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">
                                  -{couponDiscount}%
                                </span>
                              )}
                            </div>
                            <div className="text-gray-500 text-[10px] md:text-xs mt-1">
                              <span className="strike mr-1">de {fmt(origB)}</span> 
                              ➔ por <span className="text-white font-semibold">{fmt(discB)}</span>
                              <span className="text-green-500 font-bold ml-1">• Economia {fmt(origB - discB)}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right font-semibold text-white">
                            {fmt(discB)}
                          </td>
                        </tr>
                      );
                    })}

                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-800/20 font-extrabold text-sm text-white">
                      <td className="p-3">
                        Total <span className="text-green-500 text-xs font-bold block sm:inline ml-1">(Economia {fmt(getTotalEconomy())})</span>
                      </td>
                      <td className="p-3 text-right text-base text-blue-400">
                        {fmt(getCartTotal())}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              {/* Savings Banner */}
              <div className="p-3.5 border-t border-[#334155] bg-blue-500/10 text-blue-400 font-bold text-center text-xs md:text-sm">
                🎉 <strong>Parabéns!</strong> Você está economizando <strong className="text-white">{fmt(getTotalEconomy())}</strong> hoje.
              </div>
            </div>

            {/* Trust Bar Info */}
            <div className="my-4 p-3.5 bg-[#0f172a]/60 border border-[#334155] rounded-[12px] text-center text-xs md:text-sm text-gray-400 leading-snug">
              🔒 <strong>Checkout seguro</strong> — você paga no <strong>Mercado Pago</strong> (Pix, Cartão, Boleto). Seus dados são criptografados de ponta a ponta.
            </div>

            {/* CTA checkout payments buttons */}
            <div className="my-6">
              
              <div className="flex items-center justify-center font-bold text-xs text-gray-500 uppercase tracking-widest gap-3 mb-4">
                <span className="w-12 h-[1px] bg-gray-700"></span>
                <span>Escolha como pagar</span>
                <span className="w-12 h-[1px] bg-gray-700"></span>
              </div>

              {/* Payment Triggers grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                
                {/* 1. Mercado Pago Redirect */}
                <button 
                  type="button"
                  onClick={pagarMercadoPago}
                  className="flex items-center justify-center gap-2.5 p-4 rounded-xl border border-white/10 text-white font-extrabold text-sm md:text-base cursor-pointer shadow-lg hover:translate-y-[-2px] transition-all bg-gradient-to-r from-[#00B2FF] to-[#009EE3] border-b-4 border-[#008AC5] active:translate-y-[1px]"
                >
                  <img 
                    src="https://emuladores.github.io/ps2/checkout2/images/payment-methods/mercadopago.webp" 
                    alt="Mercado Pago" 
                    className="w-7 h-7 object-contain filter drop-shadow-md"
                  />
                  <span>Mercado Pago</span>
                </button>

                {/* 2. PIX Modal trigger */}
                <button 
                  type="button"
                  onClick={abrirPixFlow}
                  className="flex items-center justify-center gap-2.5 p-4 rounded-xl border border-white/10 text-white font-extrabold text-sm md:text-base cursor-pointer shadow-lg hover:translate-y-[-2px] transition-all bg-gradient-to-r from-[#38C7B7] to-[#20A597] border-b-4 border-[#1a8f81] active:translate-y-[1px]"
                >
                  <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-md">
                    <img 
                      src="https://emuladores.github.io/ps2/checkout2/images/payment-methods/pix.svg" 
                      alt="PIX" 
                      className="w-4.5 h-4.5"
                    />
                  </span>
                  <span>PIX à vista</span>
                </button>

                {/* 3. Card Payment Modal trigger */}
                <button 
                  type="button"
                  onClick={abrirCardFlow}
                  className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-gray-200 bg-white text-[#1e293b] font-extrabold text-sm md:text-base cursor-pointer shadow-lg hover:translate-y-[-2px] transition-all border-b-4 border-[#d1d5db] active:translate-y-[1px]"
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="w-5 h-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <path d="M2 10h20" />
                    </svg>
                    <span>Cartão de Crédito</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <img src="https://emuladores.github.io/ps2/checkout2/images/payment-methods/visa.svg" alt="Visa" className="h-3.5 object-contain" />
                    <img src="https://emuladores.github.io/ps2/checkout2/images/payment-methods/mastercard.webp" alt="Mastercard" className="h-3.5 object-contain" />
                    <img src="https://emuladores.github.io/ps2/checkout2/images/payment-methods/elo.svg" alt="Elo" className="h-3.5 object-contain" />
                    <img src="https://emuladores.github.io/ps2/checkout2/images/payment-methods/amex.svg" alt="Amex" className="h-3.5 object-contain" />
                  </div>
                </button>

              </div>
            </div>

            {/* Social Proof details underneath buttons */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-t border-[#334155] pt-6 mt-6">
              
              <div className="flex flex-col">
                <span className="text-white font-bold text-xs md:text-sm">Mais de 12.000 clientes satisfeitos</span>
                <div className="flex items-center gap-1 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-white text-xs font-extrabold ml-1.5">4.8 / 5 <span className="text-gray-400 font-normal ml-0.5">(12.854 usuários)</span></span>
                </div>
              </div>

              {/* Payment methods logos */}
              <div className="flex items-center gap-1.5 flex-wrap opacity-60">
                <img src="https://emuladores.github.io/ps2/checkout2/images/payment-methods/mercadopago.webp" alt="Mercado Pago" className="h-5" />
                <img src="https://emuladores.github.io/ps2/checkout2/images/payment-methods/pix.svg" alt="Pix" className="h-5" />
                <img src="https://emuladores.github.io/ps2/checkout2/images/payment-methods/visa.svg" alt="Visa" className="h-5" />
                <img src="https://emuladores.github.io/ps2/checkout2/images/payment-methods/mastercard.webp" alt="Mastercard" className="h-5" />
                <img src="https://emuladores.github.io/ps2/checkout2/images/payment-methods/elo.svg" alt="Elo" className="h-5" />
                <img src="https://emuladores.github.io/ps2/checkout2/images/payment-methods/amex.svg" alt="Amex" className="h-5" />
                <img src="https://emuladores.github.io/ps2/checkout2/images/payment-methods/diners-club.svg" alt="Diners Club" className="h-5" />
                <img src="https://emuladores.github.io/ps2/checkout2/images/payment-methods/boleto.webp" alt="Boleto" className="h-5" />
              </div>

            </div>

          </section>

          {/* Sidebar Area: FAQ & Testimonials */}
          <aside className="space-y-4">
            
            {/* Rotating testimonials block */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-[14px] p-4 shadow-xl">
              <h3 className="text-white font-bold text-sm md:text-base border-b border-[#334155] pb-2 mb-3">
                O que dizem nossos clientes
              </h3>
              
              <div className="space-y-4">
                {displayedTestimonials.map((t, idx) => {
                  const initial = t.name.charAt(0).toUpperCase();
                  const colors = ['#eab308', '#22c55e', '#3b82f6', '#f97316', '#a855f7', '#ec4899'];
                  const colorIdx = t.name.charCodeAt(0) % colors.length;
                  const bgColor = colors[colorIdx];

                  return (
                    <div key={idx} className="bg-gray-800/30 p-3 rounded-lg border border-[#334155]/60 hover:bg-gray-800/40 transition-colors">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div 
                          className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0" 
                          style={{ backgroundColor: bgColor }}
                        >
                          {initial}
                        </div>
                        <div>
                          <div className="text-white font-bold text-xs leading-none">{t.name}</div>
                          <div className="text-[10px] text-gray-500 mt-1">há 2 dias</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 mb-1.5">
                        {[...Array(t.stars)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        ))}
                        <span className="text-[#10b981] ml-1">
                          <CheckCircle2 className="h-3 w-3 fill-[#10b981] text-[#0f172a] inline" />
                        </span>
                      </div>
                      <p className="text-gray-300 text-xs leading-snug font-medium">{t.text}</p>
                    </div>
                  );
                })}
              </div>

              <div className="text-center text-gray-500 text-[10px] font-semibold mt-4 tracking-wider uppercase">
                ✓ Depoimentos verificados
              </div>
            </div>

            {/* Collapsible FAQ Accordion */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-[14px] p-4 shadow-xl">
              <h3 className="text-white font-bold text-sm md:text-base border-b border-[#334155] pb-2 mb-3">
                FAQ — antes de finalizar
              </h3>
              
              <div className="divide-y divide-[#334155]">
                {FAQ_ITEMS.map((item, idx) => {
                  const isOpen = !!expandedFaq[idx];
                  return (
                    <div key={idx} className="py-2.5">
                      <button 
                        onClick={() => toggleFaq(idx)}
                        className="w-full flex items-center justify-between text-left text-white font-semibold text-xs md:text-sm py-1 focus:outline-none hover:text-blue-400 transition-colors"
                      >
                        <span>{item.q}</span>
                        {isOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-gray-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />}
                      </button>
                      
                      {isOpen && (
                        <p className="text-gray-400 text-xs mt-1.5 leading-snug font-medium transition-all">
                          {item.a}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </aside>

        </div>

      </div>

      {/* Footer */}
      <footer className="max-w-[1180px] mx-auto mt-12 px-4 text-center border-t border-[#334155] pt-8">
        
        <div className="flex justify-center items-center gap-6 text-xs text-gray-400 mb-6 font-semibold">
          <a href="mailto:contato@digitalstoregames.com" className="hover:text-white transition-colors flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" /> Email
          </a>
          <a href="https://wa.me/5541996260115" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5" /> WhatsApp
          </a>
        </div>

        <div className="flex justify-center items-center gap-4 flex-wrap pb-6">
          <a href="https://www.siteconfiavel.com.br/site/digitalstoregames-com" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
            <img src="https://emuladores.github.io/ps2/checkout2/images/trust-seals/siteconfiavel.webp" className="h-10 object-contain rounded" alt="Site Confiável" />
          </a>
          <a href="https://www.websiteplanet.com/pt-br/webtools/ssl-checker/?url=digitalstoregames.com" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
            <img src="https://emuladores.github.io/ps2/checkout2/images/trust-seals/ssl.webp" className="h-10 object-contain rounded" alt="SSL Seguro" />
          </a>
          <a href="https://www.mercadopago.com.br/ajuda/23185" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
            <img src="https://emuladores.github.io/ps2/checkout2/images/trust-seals/mercadopagogarantia.webp" className="h-10 object-contain rounded" alt="Mercado Pago Garantia" />
          </a>
        </div>

      </footer>

      {/* Floating help WhatsApp Button */}
      <a 
        href={`https://api.whatsapp.com/send?phone=5541996260115&text=Gostaria%20de%20mais%20informa%C3%A7%C3%B5es%20sobre%20o%20produto%20${encodeURIComponent(mainProduct.title)}`}
        className="whatsapp-float" 
        target="_blank" 
        rel="noopener noreferrer" 
        aria-label="Fale conosco no WhatsApp"
      >
        <span className="whatsapp-tooltip">Precisa de ajuda?</span>
        <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      </a>

      {/* Global Spinner Overlay */}
      {globalLoading && (
        <div className="fixed inset-0 bg-[#0f172a]/95 text-white z-[99999] flex flex-col items-center justify-center p-6 text-center">
          <div className="border-4 border-gray-700 border-t-blue-500 rounded-full w-12 h-12 animate-spin mb-4"></div>
          <p className="font-semibold text-base">{globalLoadingMsg}</p>
        </div>
      )}

      {/* PIX Payment Modal */}
      {pixModalOpen && pixData && (
        <div className="fixed inset-0 bg-black/85 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center text-gray-900 shadow-2xl relative">
            <h2 className="text-[#00b04a] font-extrabold text-xl mb-1 flex items-center justify-center gap-1.5">
              🏦 Pague com PIX
            </h2>
            <p className="text-gray-500 text-xs mb-4">Escaneie o QR Code ou copie o código Pix abaixo</p>
            
            {pixData.qr_code_base64 && (
              <img 
                src={`data:image/png;base64,${pixData.qr_code_base64}`}
                alt="QR Code PIX" 
                className="w-48 h-48 border-4 border-[#00b04a] rounded-xl mx-auto block shadow"
              />
            )}
            
            <p className="font-extrabold text-xl text-gray-800 mt-4 mb-2">{fmt(pixData.amount)}</p>
            
            <p className="text-[10px] text-gray-400 bg-gray-550/10 border border-gray-200 rounded-lg p-2 font-mono break-all leading-normal max-h-16 overflow-y-auto mb-4 select-text">
              {pixData.qr_code}
            </p>

            <button 
              type="button" 
              onClick={copiarPixCode}
              className="w-full py-3 bg-[#00b04a] hover:bg-[#009b40] text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-1.5 shadow"
            >
              {pixCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{pixCopied ? '✓ Copiado!' : '📋 Copiar código PIX'}</span>
            </button>

            <div className="mt-4 text-xs font-semibold flex items-center justify-center gap-2 text-gray-600 min-h-6">
              {pixConfirmed ? (
                <span className="text-green-600 font-extrabold flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 fill-green-600 text-white" />
                  Pagamento confirmado! Verifique seu e-mail.
                </span>
              ) : (
                <>
                  <span>{pixStatusText}</span>
                  {!pixStatusText.includes('cancelado') && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />}
                </>
              )}
            </div>

            <button 
              type="button" 
              onClick={fecharPixModal}
              className="mt-3.5 px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Card Payment Modal */}
      {cardModalOpen && (
        <div className="fixed inset-0 bg-black/85 z-[9999] flex items-start justify-center p-4 overflow-y-auto pt-10">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full text-gray-900 shadow-2xl relative max-h-[90vh] overflow-y-auto select-text">
            <div className="flex justify-between items-center pb-2.5 mb-3 border-b border-gray-100">
              <h2 className="font-extrabold text-base text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M2 10h20" />
                </svg>
                Pagar com cartão
              </h2>
              <button 
                type="button" 
                onClick={fecharCardModal}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg px-2"
              >
                ✕
              </button>
            </div>
            
            {cardError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-xs font-semibold mb-3 border border-red-200">
                {cardError}
              </div>
            )}

            <div id="cardBrickContainer"></div>

            {cardSuccess && (
              <p className="text-green-600 font-bold text-center text-sm mt-3">
                ✅ Pagamento aprovado! Redirecionando...
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
