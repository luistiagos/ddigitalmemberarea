import { Navbar } from '@/components/Navbar';

/**
 * Layout da área autenticada.
 * Inclui a Navbar fixa e o conteúdo principal centralizado.
 */
export function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
