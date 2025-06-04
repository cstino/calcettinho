// Utility per ottenere l'URL base corretto per le API
export const getApiBaseUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  
  // In produzione usa le URL relative per sfruttare il rewriting di Next.js
  if (process.env.NODE_ENV === 'production') {
    return '';
  }
  
  // Se siamo in sviluppo su localhost, usa localhost
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  
  // Altrimenti usa l'IP con porta 3001 (per sviluppo su rete locale)
  const baseUrl = `http://${window.location.hostname}:3001`;
  console.log('[MOBILE DEBUG] getApiBaseUrl:', baseUrl);
  return baseUrl;
};

// Utility per ottenere l'URL completo di una card
export const getCardUrl = (email: string) => {
  const url = `${getApiBaseUrl()}/api/card/${encodeURIComponent(email)}`;
  console.log('[MOBILE DEBUG] getCardUrl for', email, ':', url);
  return url;
};

// Utility per ottenere l'URL completo di una card speciale
export const getSpecialCardUrl = (email: string, template: string) => {
  const url = `${getApiBaseUrl()}/api/card-special/${encodeURIComponent(email)}?template=${template}`;
  console.log('[MOBILE DEBUG] getSpecialCardUrl for', email, template, ':', url);
  return url;
};

// Utility per ottenere l'URL completo di una foto profilo
export const getPlayerPhotoUrl = (email: string) => {
  const url = `${getApiBaseUrl()}/api/players/${encodeURIComponent(email)}`;
  console.log('[MOBILE DEBUG] getPlayerPhotoUrl for', email, ':', url);
  return url;
}; 