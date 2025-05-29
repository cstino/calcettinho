'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthenticated = !!user;

  useEffect(() => {
    // Se non è in loading e non è autenticato, reindirizza al login
    if (!loading && !isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router, pathname]);

  // Mostra un loader mentre verifica l'autenticazione
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
          <p className="text-gray-200 mt-4 font-runtime">Verifica accesso...</p>
        </div>
      </div>
    );
  }

  // Se non autenticato e non in pagina login, non mostra nulla (il redirect è in corso)
  if (!isAuthenticated && pathname !== '/login') {
    return null;
  }

  // Se autenticato o in pagina login, mostra il contenuto
  return <>{children}</>;
} 