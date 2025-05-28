'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  login: (email: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Fix hydration - assicurati che siamo sul client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Verifica se l'utente è già loggato al caricamento
  useEffect(() => {
    if (!isClient) return;
    
    try {
      const savedEmail = localStorage.getItem('calcettinho_user_email');
      if (savedEmail) {
        setUserEmail(savedEmail);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Errore nel recupero dati localStorage:', error);
    } finally {
      setLoading(false);
    }
  }, [isClient]);

  const login = async (email: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Verifica se l'email è nella whitelist
      const response = await fetch('/api/auth/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (result.success && result.allowed) {
        setUserEmail(email);
        setIsAuthenticated(true);
        if (isClient) {
          localStorage.setItem('calcettinho_user_email', email);
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('Errore durante il login:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUserEmail(null);
    setIsAuthenticated(false);
    if (isClient) {
      localStorage.removeItem('calcettinho_user_email');
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      userEmail,
      login,
      logout,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve essere usato all\'interno di un AuthProvider');
  }
  return context;
} 