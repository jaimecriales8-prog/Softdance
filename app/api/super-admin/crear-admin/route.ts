import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'super_admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { nombre, email, password, escuela_id } = await request.json()
  if (!nombre || !email || !password || !escuela_id) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const service = createServiceClient()

  // Crear usuario en Auth
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Crear perfil
  const { data: perfilData, error: perfilError } = await service.from('perfiles').insert({
    id: authData.user.id,
    escuela_id,
    rol: 'admin_escuela',
    nombre,
    email,
  }).select().single()

  if (perfilError) {
    // Revertir usuario si falla el perfil
    await service.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: perfilError.message }, { status: 400 })
  }

  return NextResponse.json({ perfil: perfilData })
}
