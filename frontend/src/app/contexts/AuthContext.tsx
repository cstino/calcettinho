'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  email: string;
  role: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  userEmail: string | null;
  loading: boolean;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
  checkAdminAccess: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Controlla il ruolo utente
  const checkUserRole = async (email: string): Promise<User | null> => {
    try {
      const response = await fetch(`/api/auth/role/${encodeURIComponent(email)}`);
      const data = await response.json();
      
      if (data.success) {
        return {
          email: data.email,
          role: data.role,
          isAdmin: data.isAdmin
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
      checkAdminAccess
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