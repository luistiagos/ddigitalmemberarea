import { Navbar } from '@/components/Navbar';
import { MessageCircle, Mail } from 'lucide-react';

function SupportFooter() {
  return (
    <footer className="mt-16 border-t border-gray-800">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
          Suporte
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="https://wa.me/554196260115"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-2.5 text-sm font-medium text-green-400 hover:bg-green-500/20 hover:border-green-500/60 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp: +55 41 9626-0115
          </a>
          <a
            href="mailto:contato@digitalstoregames.com"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800/50 px-5 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:border-gray-600 hover:text-gray-200 transition-colors"
          >
            <Mail className="h-4 w-4" />
            contato@digitalstoregames.com
          </a>
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
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
      <SupportFooter />
    </div>
  );
}
