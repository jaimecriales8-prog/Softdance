import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.EMAIL_FROM ?? 'Softdance <onboarding@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://softdance.vercel.app'

export async function enviarBienvenida({
  email, nombre, password, rol,
}: {
  email: string; nombre: string; password: string; rol: 'padre' | 'profesor' | 'admin_escuela'
}) {
  const portalUrl = rol === 'padre' ? `${APP_URL}/familia`
    : rol === 'profesor' ? `${APP_URL}/profesor`
    : `${APP_URL}/escuela`

  const rolLabel = rol === 'padre' ? 'Portal de familias'
    : rol === 'profesor' ? 'Portal de profesores'
    : 'Panel de administración'

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Bienvenido/a a Softdance — tus datos de acceso`,
    html: emailHtml(`Bienvenido/a, ${nombre}`, `
      <p>Tu cuenta en <strong>Softdance</strong> ha sido creada. Aquí están tus datos de acceso:</p>
      <table style="margin:24px 0;width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:10px 14px;background:#1a1a1a;border-radius:8px 8px 0 0;color:#999;font-size:12px;text-transform:uppercase;letter-spacing:0.05em">Correo</td>
          <td style="padding:10px 14px;background:#111;border-radius:8px 8px 0 0;color:#fff;font-size:14px">${email}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;background:#1a1a1a;border-radius:0 0 8px 8px;color:#999;font-size:12px;text-transform:uppercase;letter-spacing:0.05em">Contraseña</td>
          <td style="padding:10px 14px;background:#111;border-radius:0 0 8px 8px;color:#fff;font-size:14px;font-family:monospace">${password}</td>
        </tr>
      </table>
      <p style="color:#999">Te recomendamos cambiar tu contraseña después de ingresar por primera vez.</p>
      <a href="${portalUrl}" style="display:inline-block;margin-top:8px;background:#e91e8c;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
        Acceder a ${rolLabel}
      </a>
    `),
  })
}

export async function enviarResetPassword({
  email, nombre, resetUrl,
}: {
  email: string; nombre: string; resetUrl: string
}) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Restablecer contraseña — Softdance`,
    html: emailHtml('Restablecer contraseña', `
      <p>Hola${nombre ? `, ${nombre}` : ''}. Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
      <p style="color:#999;font-size:13px">Este enlace expira en 1 hora.</p>
      <a href="${resetUrl}" style="display:inline-block;margin-top:16px;background:#e91e8c;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
        Restablecer contraseña
      </a>
      <p style="margin-top:24px;color:#666;font-size:12px">Si no solicitaste esto, ignora este correo. Tu contraseña no cambiará.</p>
    `),
  })
}

function emailHtml(titulo: string, contenido: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#fff">
  <div style="max-width:520px;margin:40px auto;padding:0 16px">
    <div style="margin-bottom:32px">
      <span style="font-size:24px;font-weight:700;letter-spacing:-0.02em">Soft<span style="color:#e91e8c">dance</span></span>
    </div>
    <div style="background:#111;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px">
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#fff">${titulo}</h2>
      <div style="color:#ccc;font-size:14px;line-height:1.6">${contenido}</div>
    </div>
    <p style="margin-top:24px;color:#444;font-size:12px;text-align:center">
      © ${new Date().getFullYear()} Softdance · <a href="${APP_URL}" style="color:#666;text-decoration:none">softdance.vercel.app</a>
    </p>
  </div>
</body>
</html>`
}
