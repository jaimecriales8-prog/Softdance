const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM = process.env.EMAIL_FROM ?? 'Softdance <onboarding@resend.dev>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://softdance.vercel.app'

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!RESEND_API_KEY) return
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
}

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

  await sendEmail({
    to: email,
    subject: 'Bienvenido/a a Softdance — tus datos de acceso',
    html: emailHtml(`Bienvenido/a, ${nombre}`, `
      <p>Tu cuenta en <strong>Softdance</strong> ha sido creada. Aquí están tus datos de acceso:</p>
      <table style="margin:24px 0;width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:10px 14px;background:#1a1a1a;color:#999;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;border-radius:8px 8px 0 0">Correo</td>
          <td style="padding:10px 14px;background:#111;color:#fff;font-size:14px;border-radius:8px 8px 0 0">${email}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;background:#1a1a1a;color:#999;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;border-radius:0 0 8px 8px">Contraseña</td>
          <td style="padding:10px 14px;background:#111;color:#fff;font-size:14px;font-family:monospace;border-radius:0 0 8px 8px">${password}</td>
        </tr>
      </table>
      <p style="color:#999">Te recomendamos cambiar tu contraseña después de ingresar por primera vez.</p>
      <a href="${portalUrl}" style="display:inline-block;margin-top:8px;background:#e91e8c;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
        Acceder a ${rolLabel}
      </a>
    `),
  })
}

export async function enviarNuevaMensualidad({
  email, nombreFamilia, periodo, total, fechaLimite, detalle,
}: {
  email: string; nombreFamilia: string; periodo: string; total: number
  fechaLimite: string | null; detalle: { alumna: string; lineas: { concepto: string; valor: number }[] }[]
}) {
  const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const [a, m] = periodo.split('-').map(Number)
  const mesLabel = `${MESES[m]} ${a}`
  const vence = fechaLimite
    ? new Date(fechaLimite + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const detalleHtml = detalle.map(d => `
    <p style="margin:12px 0 4px;font-size:13px;font-weight:600;color:#fff">${d.alumna}</p>
    ${d.lineas.map(l => `
      <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px;color:#999">
        <span>${l.concepto}</span><span style="color:#ccc">$${l.valor.toLocaleString('es-CO')}</span>
      </div>`).join('')}`).join('')

  await sendEmail({
    to: email,
    subject: `Mensualidad ${mesLabel} — $${total.toLocaleString('es-CO')}`,
    html: emailHtml(`Mensualidad ${mesLabel}`, `
      <p>Hola, <strong>${nombreFamilia}</strong>. Tu mensualidad de <strong>${mesLabel}</strong> ya está disponible.</p>
      <div style="background:#1a1a1a;border-radius:12px;padding:20px;margin:20px 0">
        ${detalleHtml}
        <div style="display:flex;justify-content:space-between;padding:12px 0 0;margin-top:8px;border-top:1px solid rgba(255,255,255,0.1);font-size:15px;font-weight:700">
          <span style="color:#fff">Total</span>
          <span style="color:#e91e8c">$${total.toLocaleString('es-CO')}</span>
        </div>
      </div>
      ${vence ? `<p style="color:#999;font-size:13px">Fecha límite de pago: <strong style="color:#fff">${vence}</strong></p>` : ''}
      <a href="${APP_URL}/familia/mensualidades" style="display:inline-block;margin-top:8px;background:#e91e8c;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
        Ver mi cuenta
      </a>
    `),
  })
}

export async function enviarRecordatorioPago({
  email, nombreFamilia, periodo, total, fechaLimite,
}: {
  email: string; nombreFamilia: string; periodo: string; total: number; fechaLimite: string
}) {
  const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const [a, m] = periodo.split('-').map(Number)
  const mesLabel = `${MESES[m]} ${a}`
  const vence = new Date(fechaLimite + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })

  await sendEmail({
    to: email,
    subject: `Recordatorio: mensualidad ${mesLabel} vence el ${vence}`,
    html: emailHtml('Recordatorio de pago', `
      <p>Hola, <strong>${nombreFamilia}</strong>. Te recordamos que tu mensualidad de <strong>${mesLabel}</strong> vence en 3 días.</p>
      <div style="background:#1a1a1a;border-radius:12px;padding:20px;margin:20px 0;text-align:center">
        <p style="margin:0 0 4px;color:#999;font-size:13px">Total pendiente</p>
        <p style="margin:0;font-size:32px;font-weight:700;color:#e91e8c">$${total.toLocaleString('es-CO')}</p>
        <p style="margin:8px 0 0;color:#666;font-size:13px">Vence el ${vence}</p>
      </div>
      <a href="${APP_URL}/familia/mensualidades" style="display:inline-block;margin-top:8px;background:#e91e8c;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
        Ver mi cuenta
      </a>
      <p style="margin-top:24px;color:#666;font-size:12px">Si ya realizaste el pago, ignora este mensaje.</p>
    `),
  })
}

export async function enviarConfirmacionPago({
  email, nombreFamilia, concepto, monto,
}: {
  email: string; nombreFamilia: string; concepto: string; monto: number
}) {
  await sendEmail({
    to: email,
    subject: `Pago confirmado — ${concepto}`,
    html: emailHtml('Pago recibido ✓', `
      <p>Hola, <strong>${nombreFamilia}</strong>. Confirmamos que recibimos tu pago:</p>
      <div style="background:#1a1a1a;border-radius:12px;padding:20px;margin:20px 0;text-align:center">
        <p style="margin:0 0 4px;color:#999;font-size:13px">${concepto}</p>
        <p style="margin:0;font-size:32px;font-weight:700;color:#4ade80">$${monto.toLocaleString('es-CO')}</p>
        <p style="margin:8px 0 0;color:#4ade80;font-size:13px;font-weight:600">✓ Aprobado</p>
      </div>
      <a href="${APP_URL}/familia/recibo" style="display:inline-block;margin-top:8px;background:#e91e8c;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
        Ver mi estado de cuenta
      </a>
    `),
  })
}

export async function enviarResetPassword({
  email, nombre, resetUrl,
}: {
  email: string; nombre: string; resetUrl: string
}) {
  await sendEmail({
    to: email,
    subject: 'Restablecer contraseña — Softdance',
    html: emailHtml('Restablecer contraseña', `
      <p>Hola${nombre ? `, ${nombre}` : ''}. Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
      <p style="color:#999;font-size:13px">Este enlace expira en 1 hora.</p>
      <a href="${resetUrl}" style="display:inline-block;margin-top:16px;background:#e91e8c;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
        Restablecer contraseña
      </a>
      <p style="margin-top:24px;color:#666;font-size:12px">Si no solicitaste esto, ignora este correo.</p>
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
