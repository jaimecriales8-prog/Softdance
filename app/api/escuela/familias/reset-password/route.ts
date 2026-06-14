import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('perfiles').select('escuela_id, rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin_escuela') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { familia_id, password } = await request.json()
  if (!familia_id || !password) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
  if (password.length < 6) return NextResponse.json({ error: 'La contraseña debe tener mínimo 6 caracteres' }, { status: 400 })

  const service = createServiceClient()

  // Obtener user_id de la familia verificando que pertenece a esta escuela
  const { data: familia } = await service
    .from('familias')
    .select('user_id')
    .eq('id', familia_id)
    .eq('escuela_id', perfil.escuela_id)
    .single()

  if (!familia) return NextResponse.json({ error: 'Familia no encontrada' }, { status: 404 })

  const { error } = await service.auth.admin.updateUserById(familia.user_id, { password })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
