// Utility per ottenere la base URL dell'API
export const getApiBaseUrl = () => {
  // In produzione usa l'URL del deploy, in sviluppo usa localhost:3001
  if (process.env.NODE_ENV === 'production') {
    // Se siamo in produzione, usa l'URL del deploy corrente
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    // Fallback per SSR
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'https://calcettinho.netlify.app';
  }
  return 'http://localhost:3001';
};

// Utility per ottenere l'URL completo di una card
export const getCardUrl = (email: string) => {
  const url = `${getApiBaseUrl()}/api/card/${encodeURIComponent(email)}`;
  return url;
};

// Utility per ottenere l'URL completo di una card speciale
export const getSpecialCardUrl = (email: string, template: string) => {
  const url = `${getApiBaseUrl()}/api/card-special/${encodeURIComponent(email)}?template=${template}`;
  return url;
};

// Utility per ottenere l'URL completo di una foto profilo
export const getPlayerPhotoUrl = (email: string) => {
  const url = `${getApiBaseUrl()}/api/players/${encodeURIComponent(email)}`;
  return url;
}; 