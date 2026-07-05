/**
 * Invio email transazionali via Brevo (ex Sendinblue), REST API diretta (no SDK).
 *
 * Finché BREVO_API_KEY non è impostata, sendEmail logga soltanto e non fallisce:
 * il resto del flusso di registrazione funziona comunque (degrado controllato),
 * l'invio reale si attiva da solo appena la chiave viene configurata.
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;

  if (!apiKey || !fromEmail) {
    console.log(`[email] BREVO_API_KEY o EMAIL_FROM non configurate — email non inviata a ${to}: "${subject}"`);
    return;
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: { email: fromEmail, name: 'Calcettinho' },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error(`[email] Invio fallito a ${to}: HTTP ${response.status} ${body}`);
  }
}

export function adminEmail(): string | null {
  return process.env.ADMIN_EMAIL || null;
}
