'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  email: string;
  role: string;
  isAdmin: boolean;
  isReferee: boolean;
  hasMatchManagementPrivileges: boolean;
}

interface AuthContextType {
  user: User | null;
  userEmail: string | null;
  loading: boolean;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
  checkAdminAccess: () => boolean;
  checkRefereeAccess: () => boolean;
  checkMatchManagementAccess: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Controlla il ruolo utente
  const checkUserRole = async (email: string): Promise<User | null> => {
    try {
      // Costruisci URL backend: usa NEXT_PUBLIC_BACKEND_URL se definita, altrimenti stessa origin
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
      const apiPath = `/api/auth/role/${encodeURIComponent(email)}`;
      const url = baseUrl ? `${baseUrl.replace(/\/$/, '')}${apiPath}` : apiPath;

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        console.error('Controllo ruolo non OK:', response.status, response.statusText);
        return null;
      }

      // Tenta il parse JSON solo se il content-type è corretto
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.error('Risposta non JSON dal backend auth/role');
        return null;
      }

      const data = await response.json();
      
      if (data.success) {
        return {
          email: data.email,
          role: data.role,
          isAdmin: data.isAdmin,
          isReferee: data.isReferee,
          hasMatchManagementPrivileges: data.hasMatchManagementPrivileges
        };
      }
      return null;
    } catch (error) {
      console.error('Errore nel controllo ruolo:', error);
      return null;
    }
  };

  // Login dell'utente
  const login = async (email: string): Promise<boolean> => {
    setLoading(true);
    try {
      const userData = await checkUserRole(email);
      if (userData) {
        setUser(userData);
        localStorage.setItem('userEmail', email);
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout dell'utente
  const logout = () => {
    setUser(null);
    localStorage.removeItem('userEmail');
  };

  // Controlla se l'utente ha accesso admin
  const checkAdminAccess = (): boolean => {
    return user?.isAdmin || false;
  };

  // Controlla se l'utente è arbitro
  const checkRefereeAccess = (): boolean => {
    return user?.isReferee || false;
  };

  // Controlla se l'utente può gestire partite (admin o arbitro)
  const checkMatchManagementAccess = (): boolean => {
    return user?.hasMatchManagementPrivileges || false;
  };

  // Carica utente dal localStorage all'avvio
  useEffect(() => {
    const initAuth = async () => {
      const savedEmail = localStorage.getItem('userEmail');
      if (savedEmail) {
        const userData = await checkUserRole(savedEmail);
        if (userData) {
          setUser(userData);
        } else {
          localStorage.removeItem('userEmail');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      userEmail: user?.email || null,
      loading,
      login,
      logout,
      checkAdminAccess,
      checkRefereeAccess,
      checkMatchManagementAccess
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 