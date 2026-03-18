import { useState } from 'react';
import { Gamepad2, ExternalLink, Lock, Loader2 } from 'lucide-react';
import api from '@/services/api';

function formatBRL(val) {
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Card de produto para a área do cliente.
 * - owned=true  → imagem + "Aqui está o que você comprou, divirta-se!" + botão verde Acessar
 * - owned=false → imagem em cinza com cadeado + badge de preço + botão neon Desbloquear
 *
 * @param {{ product, userEmail, storeId }}
 */
export function ProductCard({ product, userEmail, storeId }) {
  const { productid, title, image, owned, price, relprice, description, deliverlink } = product;
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState(null);

  const handleBuy = async () => {
    setBuying(true);
    setBuyError(null);
    try {
      const params = new URLSearchParams({ sids: productid });
      if (userEmail) params.set('email', userEmail);
      if (storeId)   params.set('storeid', storeId);
      const res = await api.get(`/createMLlink_v2?${params}`);
      if (res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        setBuyError('Não foi possível gerar o link. Tente novamente.');
      }
    } catch {
      setBuyError('Erro ao processar. Tente novamente.');
    } finally {
      setBuying(false);
    }
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
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 via-transparent to-transparent" />
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
  const displayPrice   = price    != null ? Number(price)    : null;
  const displayRelPrice = relprice != null ? Number(relprice) : null;
  const discount =
    displayRelPrice && displayPrice && displayRelPrice > displayPrice
      ? Math.round((1 - displayPrice / displayRelPrice) * 100)
      : null;

  return (
    <article className="flex flex-col rounded-xl border border-gray-700/60 bg-gray-800/50 overflow-hidden animate-fade-in transition-all duration-200 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5">
      {/* Imagem com overlay e cadeado */}
      <div className="relative w-full h-44 bg-gray-900 overflow-hidden shrink-0">
        {image
          ? <img src={image} alt={title} className="w-full h-full object-cover opacity-55" />
          : <div className="w-full h-full flex items-center justify-center"><Gamepad2 className="h-16 w-16 text-gray-600" /></div>}
        {/* Gradiente escuro na base */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/70 via-transparent to-transparent" />
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
          onClick={handleBuy}
          disabled={buying}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-gray-900 font-bold text-sm py-2.5 px-4 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {buying
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Lock className="h-4 w-4" />}
          {buying ? 'Aguarde...' : 'Desbloquear'}
        </button>
        {buyError && (
          <p className="text-xs text-red-400 text-center mt-1">{buyError}</p>
        )}
      </div>
    </article>
  );
}
