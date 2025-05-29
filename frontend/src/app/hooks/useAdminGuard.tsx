'use client';

import { useAuth } from '../contexts/AuthContext';

export function useAdminGuard() {
  const { user, loading, checkAdminAccess } = useAuth();

  return {
    isAdmin: checkAdminAccess(),
    isLoading: loading,
    user,
    // Componente per nascondere contenuto se non admin
    AdminOnly: ({ children }: { children: React.ReactNode }) => {
      if (loading) return null;
      return checkAdminAccess() ? <>{children}</> : null;
    },
    // Funzione per controllare se mostrare elementi admin
    shouldShowAdminFeatures: () => !loading && checkAdminAccess()
  };
} 