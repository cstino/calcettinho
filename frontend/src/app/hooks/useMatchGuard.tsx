'use client';

import { useAuth } from '../contexts/AuthContext';

export function useMatchGuard() {
  const { user, loading, checkAdminAccess, checkRefereeAccess, checkMatchManagementAccess } = useAuth();

  return {
    isAdmin: checkAdminAccess(),
    isReferee: checkRefereeAccess(),
    canManageMatches: checkMatchManagementAccess(),
    isLoading: loading,
    user,
    // Componente per nascondere contenuto se non admin
    AdminOnly: ({ children }: { children: React.ReactNode }) => {
      if (loading) return null;
      return checkAdminAccess() ? <>{children}</> : null;
    },
    // Componente per nascondere contenuto se non arbitro
    RefereeOnly: ({ children }: { children: React.ReactNode }) => {
      if (loading) return null;
      return checkRefereeAccess() ? <>{children}</> : null;
    },
    // Componente per nascondere contenuto se non può gestire partite (admin o arbitro)
    MatchManagerOnly: ({ children }: { children: React.ReactNode }) => {
      if (loading) return null;
      return checkMatchManagementAccess() ? <>{children}</> : null;
    },
    // Funzioni per controllare se mostrare elementi specifici
    shouldShowAdminFeatures: () => !loading && checkAdminAccess(),
    shouldShowRefereeFeatures: () => !loading && checkRefereeAccess(),
    shouldShowMatchManagementFeatures: () => !loading && checkMatchManagementAccess()
  };
} 