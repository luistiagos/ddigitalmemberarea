import { Navbar } from '@/components/Navbar';
import { MessageCircle, Mail } from 'lucide-react';

function SupportFooter() {
  return (
    <footer className="mt-16 border-t border-gray-800/60">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-0">
          <span className="text-xs text-gray-600 sm:mr-3">Precisa de ajuda?</span>
          <div className="flex items-center gap-4">
            <a
              href="https://wa.me/554196260115"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-green-400 transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5 shrink-0" />
              <span>+55 41 9626-0115</span>
            </a>
            <span className="text-gray-700 select-none">·</span>
            <a
              href="mailto:contato@digitalstoregames.com"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <Mail className="h-3.5 w-3.5 shrink-0" />
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
