import crypto from 'crypto'
import { Resend } from 'resend'

let _resend: Resend | null = null

function getResend(): Resend {
  if (!_resend) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error('RESEND_API_KEY is not set')
    _resend = new Resend(apiKey)
  }
  return _resend
}

export function generateVerificationCode(): { code: string; codeHash: string } {
  const code = crypto.randomInt(100000, 999999).toString()
  const codeHash = crypto.createHash('sha256').update(code).digest('hex')
  return { code, codeHash }
}

export function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const resend = getResend()
  const from = process.env.MAIL_FROM || 'noreply@scaniha.com'

  await resend.emails.send({
    from,
    to,
    subject: 'Votre code de vérification Scaniha',
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:0">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden">
          <tr><td style="background:#f97316;padding:24px;text-align:center">
            <h1 style="color:#fff;margin:0;font-size:20px">Scaniha</h1>
          </td></tr>
          <tr><td style="padding:32px 24px;text-align:center">
            <p style="color:#333;font-size:16px;margin:0 0 8px">Bonjour,</p>
            <p style="color:#555;font-size:14px;margin:0 0 24px">Voici votre code de vérification :</p>
            <div style="background:#fef3e7;border-radius:8px;padding:16px;margin:0 0 24px;letter-spacing:8px;font-size:32px;font-weight:bold;color:#c2410c">${code}</div>
            <p style="color:#888;font-size:13px;margin:0">Ce code expire dans 10 minutes. Ne le partagez avec personne.</p>
          </td></tr>
          <tr><td style="background:#fafafa;padding:16px 24px;text-align:center;border-top:1px solid #eee">
            <p style="color:#aaa;font-size:12px;margin:0">&copy; 2026 Scaniha. Tous droits r&eacute;serv&eacute;s.</p>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  })
}
