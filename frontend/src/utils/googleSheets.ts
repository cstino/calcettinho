import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

export function getSheetsClient() {
  // Validazione variabili d'ambiente
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  
  if (!serviceAccountEmail) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL non trovata nelle variabili d\'ambiente');
  }
  
  if (!privateKey) {
    throw new Error('GOOGLE_PRIVATE_KEY non trovata nelle variabili d\'ambiente');
  }

  // Debug log (rimuovi in produzione)
  console.log('GOOGLE_SERVICE_ACCOUNT_EMAIL:', serviceAccountEmail);
  console.log('GOOGLE_PRIVATE_KEY (inizio):', privateKey.slice(0, 30));
  
  // Forza l'uso del legacy OpenSSL provider per compatibilità
  if (process.env.NODE_OPTIONS?.includes('--openssl-legacy-provider') === false) {
    process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --openssl-legacy-provider';
  }
  
  const client = new google.auth.JWT(
    serviceAccountEmail,
    undefined,
    privateKey.replace(/\\n/g, '\n'),
    SCOPES
  );
  
  return google.sheets({ version: 'v4', auth: client });
} 