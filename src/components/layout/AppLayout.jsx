import { Navbar } from '@/components/Navbar';
import { MessageCircle, Mail } from 'lucide-react';
import { useLang } from '@/hooks/useLang';

function SupportFooter({ t }) {
  return (
    <footer className="mt-16 border-t border-indigo-400/20 bg-[#0b1120]/70">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-0">
          <span className="text-sm font-medium text-slate-200 sm:mr-3">{t.helpNeeded}</span>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <a
              href="https://wa.me/554196260115"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300 hover:text-emerald-200 transition-colors"
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              <span>+55 41 9626-0115</span>
            </a>
            <span className="text-slate-500 select-none">·</span>
            <a
              href="mailto:contato@digitalstoregames.com"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-300 hover:text-white transition-colors"
            >
              <Mail className="h-4 w-4 shrink-0" />
              <span>contato@digitalstoregames.com</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/**
 * Layout da área autenticada.
 * Inclui a Navbar fixa, o conteúdo principal centralizado e o rodapé de suporte.
 */
export function AppLayout({ children }) {
  const { t } = useLang();
  return (
    <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_at_top,_rgba(56,189,248,0.12),_transparent_55%)] text-slate-100 flex flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
      <SupportFooter t={t} />
    </div>
  );
}
