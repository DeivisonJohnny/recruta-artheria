import { useRouter } from 'next/router';
import { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

const pageTitle: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/candidates/search': 'Pesquisar Candidatos',
  '/searches': 'Minhas Pesquisas',
  '/jobs': 'Vagas',
};

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();

  return (
    <div className="h-screen bg-linear-to-br from-gray-50 to-gray-100 flex overflow-hidden">
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8 shadow-sm shrink-0">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              {pageTitle[router.pathname] || 'Recruta Artheria'}
            </h2>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
