// Utility per ottenere la base URL dell'API
// Le API vivono nella stessa app Next.js (frontend/src/app/api), quindi bastano URL relativi
// sia in sviluppo che in produzione.
export const getApiBaseUrl = () => {
  return '';
};

// Utility per ottenere l'URL completo di una foto profilo
export const getPlayerPhotoUrl = (email: string) => {
  const url = `${getApiBaseUrl()}/api/players/${encodeURIComponent(email)}`;
  return url;
}; 