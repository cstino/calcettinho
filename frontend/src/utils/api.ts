// Utility per ottenere la base URL dell'API
export const getApiBaseUrl = () => {
  // In produzione usa URL relativi, in sviluppo usa localhost:3001
  const baseUrl = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';
  return baseUrl;
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