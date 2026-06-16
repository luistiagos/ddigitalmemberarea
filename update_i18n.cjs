const fs = require('fs');

let content = fs.readFileSync('src/pages/CheckoutPage.jsx', 'utf-8');

// Replace imports
content = content.replace("import api from '@/services/api';", "import api from '@/services/api';\nimport { TRANSLATIONS } from './translations';");

// Insert logic inside CheckoutPage
content = content.replace("export function CheckoutPage() {", "export function CheckoutPage() {\n  const [searchParams] = useSearchParams();\n  const langParam = searchParams.get('lang')?.toLowerCase() || 'ptbr';\n  const lang = TRANSLATIONS[langParam] ? langParam : 'ptbr';\n  const t = TRANSLATIONS[lang];\n");

// Remove the existing searchParams line:
content = content.replace("  const [searchParams] = useSearchParams();\n  const storeId = searchParams.get('storeid') || searchParams.get('store_id');", "  const storeId = searchParams.get('storeid') || searchParams.get('store_id');");

// Let's create an array of replacements
const replacements = [
  ["'Como recebo o acesso?'", "t.faq1q"],
  ["'Logo após o pagamento, o acesso é enviado para o seu e-mail. A liberação é imediata.'", "t.faq1a"],
  ["'Tem suporte, caso eu precise?'", "t.faq2q"],
  ["'Sim. Caso precise de ajuda, nosso suporte é feito diretamente pelo WhatsApp.'", "t.faq2a"],
  ["'E se eu não gostar?'", "t.faq3q"],
  ["'Você tem 30 dias de garantia para solicitar reembolso sem burocracia.'", "t.faq3a"],
  ["'É seguro?'", "t.faq4q"],
  ["'Sim. O pagamento é processado pelo Mercado Pago. Toda a compra é coberta pelo programa de Compra Garantida do Mercado Pago.'", "t.faq4a"],
  ["'Quanto tempo para receber o produto?'", "t.faq5q"],
  ["'Depois que o pagamento for confirmado, o produto será enviado para o seu e-mail.'", "t.faq5a"],
  ["'Recebi tudo certinho e o tutorial ajudou muito. Valeu cada centavo!'", "t.t1"],
  ["'Instalação rápida no notebook, catálogo enorme. Recomendo!'", "t.t2"],
  ["'Suporte pelo Whats funcionou de primeira. Ótimo custo-benefício.'", "t.t3"],
  ["'Comprei e em menos de 5 minutos já estava jogando. Sensacional!'", "t.t4"],
  ["'A parte do Switch com DLCs é top! Conteúdo atualizado.'", "t.t5"],
  ["'Muito bom, revivi minha infância com o PS1.'", "t.t6"],
  ["'Fácil de instalar e roda liso no meu PC antigo.'", "t.t7"],
  ["'Bastante jogo, demorei pra escolher o que jogar kkk.'", "t.t8"],
  ["'O suporte me ajudou a configurar o controle. Nota 10.'", "t.t9"],
  ["'Adorei os jogos de Super Nintendo, nostálgico demais.'", "t.t10"],
  ["'Entrega imediata mesmo, paguei e chegou no email.'", "t.t11"],
  ["'Tudo organizado, pastas separadas por console.'", "t.t12"],
  ["'Recomendo, era o que eu esperava.'", "t.t13"],
  ["'Comprei pro meu filho e ele adorou.'", "t.t14"],
  ["'Melhor pack que já comprei, sem vírus e sem enrolação.'", "t.t15"],
  ["'ID de loja inválido ou não fornecido.'", "t.errInvalidStore"],
  ["'Nenhum produto cadastrado para esta loja.'", "t.errNoProducts"],
  ["'Erro ao carregar dados da loja. Verifique sua conexão.'", "t.errFetch"],
  ["'Processando seu pagamento...'", "t.cardProcessing"],
  ["'Aguardando pagamento...'", "t.awaitingPayment"],
  ["'Redirecionando para o Mercado Pago...'", "t.redirecting"],
  ["'Erro ao gerar checkout do Mercado Pago. Tente outro método.'", "t.errGenCheckout"],
  ["'Erro ao conectar com o serviço de pagamento. Tente novamente.'", "t.errConn"],
  ["'Gerando QR Code PIX...'", "t.generatingPix"],
  ["'Erro ao processar pagamento via PIX. Tente novamente.'", "t.errPix"],
  ["'Pagamento confirmado com sucesso!'", "t.pixSuccess"],
  ["'Pagamento cancelado ou expirado. Tente novamente.'", "t.pixCancelled"],
  ["'Iniciando formulário de cartão seguro...'", "t.cardFormInit"],
  ["'Não foi possível carregar o formulário do Mercado Pago. Tente novamente.'", "t.errCardLoad"],
  ["'Ocorreu um erro no formulário. Tente novamente.'", "t.errCardForm"],
  ["'Erro ao inicializar formulário. Tente outro método.'", "t.errCardInit"],
  ["'Processando pagamento com cartão...'", "t.cardProcessing"],
  ["'Erro no pagamento: '", "t.errCardPay"],
  ["'Pagamento Aprovado! Redirecionando...'", "t.cardApproved"],
  ["'Seu pagamento está em análise pelo Mercado Pago. Você receberá a confirmação por e-mail.'", "t.cardPending"],
  ["'Pagamento não aprovado. Verifique os dados do cartão e tente novamente.'", "t.errCardDeclined"],
  ["'Erro de conexão ao processar cartão. Tente novamente.'", "t.errCardConn"],
  ["'Acesso imediato e vitalício'", "t.bullet1"],
  ["'Catálogo completo incluso'", "t.bullet2"],
  ["'Download ilimitado e sem limites'", "t.bullet3"],
  ["'Atualizações gratuitas constantes'", "t.bullet4"],
  ["'Tutorial passo a passo em vídeo'", "t.bullet5"],
  [">Carregando dados de checkout seguro...</p>", ">{t.loadingSecure}</p>"],
  [">Ops! Ocorreu um problema</h2>", ">{t.opsProblem}</h2>"],
  [">Recarregar\n", ">{t.reload}\n"],
  [">Ambiente Seguro</span>", ">{t.secureEnvironment}</span>"],
  ["VALOR TOTAL (COM BÔNUS):", "{t.totalValue}"],
  ["No Cartão ou <span", "{t.cardOrCash} <span"],
  ["à vista</div>", "{t.cash}</div>"],
  ["(Acesso Digital)</h3>", "{t.digitalAccess}</h3>"],
  ["(Acesso Digital)\n", "{t.digitalAccess}\n"],
  ["Nome Completo</label>", "{t.fullName}</label>"],
  ["placeholder=\"Seu nome\"", "placeholder={t.yourName}"],
  [">Opcional</div>", ">{t.optional}</div>"],
  [">E-mail para entrega</label>", ">{t.deliveryEmail}</label>"],
  [">E-mail inválido. Ex.: nome@site.com</div>", ">{t.invalidEmail}</div>"],
  [">Importante: verifique se digitou o e-mail corretamente para receber o acesso.</div>", ">{t.emailAssist}</div>"],
  [">Celular com DDD (opcional)</label>", ">{t.phone}</label>"],
  [">Celular inválido. Ex.: (11) 99999-9999</div>", ">{t.invalidPhone}</div>"],
  [">Usado para suporte rápido via WhatsApp e rastreamento da entrega.</div>", ">{t.phoneAssist}</div>"],
  [">Aproveite também — extras adicionais com preço especial</h2>", ">{t.bumpHeaderTitle}</h2>"],
  [">Esta oferta única expira ao sair desta página</p>", ">{t.bumpHeaderSub}</p>"],
  [">RECOMENDADO</div>", ">{t.recommended}</div>"],
  ["{bump.description || 'Adicione este item extra ao seu pacote com desconto exclusivo.'}", "{bump.description || t.bumpDefaultDesc}"],
  [">de {fmt(bumpRelPrice)}</span>", ">{t.from} {fmt(bumpRelPrice)}</span>"],
  [">por <span", ">{t.to} <span"],
  ["% de desconto</span>", "{t.discount}</span>"],
  [">Cupom de desconto (opcional)</label>", ">{t.couponLabel}</label>"],
  ["placeholder=\"Código do cupom\"", "placeholder={t.couponPlaceholder}"],
  ["'Verificando...'", "t.checking"],
  ["'Aplicado!'", "t.applied"],
  ["'Inválido'", "t.invalid"],
  ["'Erro'", "t.error"],
  ["'Aplicar'", "t.apply"],
  [">Detalhes do pedido</h3>", ">{t.summaryTitle}</h3>"],
  [">Produto</th>", ">{t.product}</th>"],
  [">Preço</th>", ">{t.price}</th>"],
  ["> ➔ por <span", "> ➔ {t.to} <span"],
  [">Total <span", ">{t.total} <span"],
  ["(Economia {fmt(getTotalEconomy())})", "({t.economy} {fmt(getTotalEconomy())})"],
  ["🎉 <strong>Parabéns!</strong> Você está economizando <strong", "🎉 <strong>{t.savingsBanner1_1}</strong> {t.savingsBanner1_2} <strong"],
  ["</strong> hoje.", "</strong> {t.savingsBanner2}"],
  ["🔒 <strong>Checkout seguro</strong> — você paga no <strong>Mercado Pago</strong> (Pix, Cartão, Boleto). Seus dados são criptografados de ponta a ponta.", "{t.trustBar}"],
  [">Mais de 12.000 clientes satisfeitos</div>", ">{t.socialProof}</div>"],
  ["(12.854 usuários)", "(12.854 {t.users})"],
  [">Você paga no Mercado Pago:</span>", ">{t.youPayVia}</span>"],
  [">⚡ Acesso imediato</span>", ">{t.immediateAccess}</span>"],
  [">💬 Suporte via WhatsApp</span>", ">{t.supportWhatsapp}</span>"],
  [">Escolha como pagar</p>", ">{t.choosePayment}</p>"],
  ["Cartão de Crédito\n", "{t.creditCard}\n"],
  [">O que dizem nossos clientes</h3>", ">{t.whatClientsSay}</h3>"],
  [">Depoimentos verificados\n", ">{t.verifiedTestimonials}\n"],
  [">FAQ — antes de finalizar</h3>", ">{t.faqTitle}</h3>"],
  ["'Gostaria de mais informações sobre o produto'", "t.wppDefaultText"],
  [">Precisa de ajuda?</span>", ">{t.helpNeeded}</span>"],
  [">🏦 Pague com PIX</h2>", ">{t.payWithPix}</h2>"],
  [">Escaneie o QR Code ou copie o código</p>", ">{t.scanQr}</p>"],
  ["'✓ Copiado!' : '📋 Copiar código PIX'", "pixCopied ? t.copied : t.copyPix"],
  [">Fechar\n", ">{t.close}\n"],
  [">💳 Pagar com cartão</h2>", ">{t.payWithCard}</h2>"],
  [">há 2 dias</div>", ">{t.daysAgo}</div>"]
];

replacements.forEach(([search, replace]) => {
  content = content.split(search).join(replace);
});

// Since FAQ and Testimonials are defined OUTSIDE the component, they don't have access to `t`.
// So we must move `FAQ_ITEMS` and `TESTIMONIALS` INSIDE `CheckoutPage`, or rewrite them.

const faqDef = `// Static FAQ Data
const FAQ_ITEMS = [
  {
    q: t.faq1q,
    a: t.faq1a
  },
  {
    q: t.faq2q,
    a: t.faq2a
  },
  {
    q: t.faq3q,
    a: t.faq3a
  },
  {
    q: t.faq4q,
    a: t.faq4a
  },
  {
    q: t.faq5q,
    a: t.faq5a
  }
];`;

const newFaqDef = `// Static FAQ Data
const getFaqItems = (t) => [
  { q: t.faq1q, a: t.faq1a },
  { q: t.faq2q, a: t.faq2a },
  { q: t.faq3q, a: t.faq3a },
  { q: t.faq4q, a: t.faq4a },
  { q: t.faq5q, a: t.faq5a }
];`;

content = content.replace(faqDef, newFaqDef);

const testDef = `// Static Testimonials
const TESTIMONIALS = [
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
];`;

const newTestDef = `// Static Testimonials
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
];`;

content = content.replace(testDef, newTestDef);

content = content.replace("const displayedTestimonials = TESTIMONIALS.slice(testimonialIdx, testimonialIdx + 3);", "const TESTIMONIALS = getTestimonials(t);\n  const displayedTestimonials = TESTIMONIALS.slice(testimonialIdx, testimonialIdx + 3);");

content = content.replace("prev + 3 >= TESTIMONIALS.length", "prev + 3 >= getTestimonials(TRANSLATIONS['ptbr']).length");

content = content.replace("{FAQ_ITEMS.map(", "{getFaqItems(t).map(");
content = content.replace("idx < FAQ_ITEMS.length", "idx < getFaqItems(t).length");

// In case the split replacement replaced the texts in the const arrays BEFORE the testDef replacements above,
// let's do a fallback:

if (content.includes("const FAQ_ITEMS = [")) {
  content = content.replace(/const FAQ_ITEMS = \[[\s\S]*?\];/, newFaqDef);
}
if (content.includes("const TESTIMONIALS = [")) {
  content = content.replace(/const TESTIMONIALS = \[[\s\S]*?\];/, newTestDef);
}

fs.writeFileSync('src/pages/CheckoutPage.jsx', content, 'utf-8');
console.log("Updated CheckoutPage.jsx!");
