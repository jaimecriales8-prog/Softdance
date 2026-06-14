import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { enviarResetPassword } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://softdance.vercel.app'

export async function POST(request: NextRequest) {
  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'Correo requerido' }, { status: 400 })

  const service = createServiceClient()

  // Check if user exists (don't reveal this to the caller)
  const { data: users } = await service.auth.admin.listUsers()
  const user = users?.users?.find(u => u.email === email)

  if (user) {
    // Generate password reset link
    const { data } = await service.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${APP_URL}/reset-password` },
    })

    if (data?.properties?.action_link) {
      const { data: perfil } = await service
        .from('perfiles')
        .select('nombre')
        .eq('id', user.id)
        .single()

      await enviarResetPassword({
        email,
        nombre: perfil?.nombre ?? '',
        resetUrl: data.properties.action_link,
      }).catch(() => {}) // don't fail if email has issues
    }
  }

  // Always return success to avoid email enumeration
  return NextResponse.json({ ok: true })
}
