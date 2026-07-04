// Utility per ottenere la base URL dell'API
// Le API vivono nella stessa app Next.js (frontend/src/app/api), quindi bastano URL relativi
// sia in sviluppo che in produzione.
export const getApiBaseUrl = () => {
  return '';
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