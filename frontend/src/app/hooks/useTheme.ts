'use client';

import { useEffect, useState } from 'react';

export function useTheme() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Forza sempre il tema dark
    document.documentElement.classList.add('dark');
    // Rimuove il tema salvato dal localStorage per evitare conflitti
    localStorage.removeItem('theme');
  }, []);

  // Non c'è più bisogno di toggleTheme dato che è sempre dark
  return { isDark: mounted ? true : false, toggleTheme: () => {} };
} 