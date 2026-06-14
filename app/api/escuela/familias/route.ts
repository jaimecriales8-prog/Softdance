import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { enviarBienvenida } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'

async function getEscuelaId(supabase: any, userId: string) {
  const { data } = await supabase.from('perfiles').select('escuela_id, rol').eq('id', userId).single()
  if (data?.rol !== 'admin_escuela') return null
  return data.escuela_id
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { nombre, email, telefono, password } = await request.json()
  if (!nombre || !email || !password) return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })

  const service = createServiceClient()

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  // Crear familia
  const { data: familia, error: familiaError } = await service.from('familias').insert({
    escuela_id: escuelaId,
    user_id: authData.user.id,
    nombre,
    email,
    telefono: telefono || null,
    activa: true,
  }).select().single()

  if (familiaError) {
    await service.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: familiaError.message }, { status: 400 })
  }

  // Crear perfil padre
  await service.from('perfiles').insert({
    id: authData.user.id,
    escuela_id: escuelaId,
    familia_id: familia.id,
    rol: 'padre',
    nombre,
    email,
  })

  // Fire-and-forget welcome email
  enviarBienvenida({ email, nombre, password, rol: 'padre' }).catch(() => {})

  return NextResponse.json({ familia })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id, nombre, email, telefono } = await request.json()
  if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 })

  const { data: familia, error } = await supabase
    .from('familias')
    .update({ nombre, email, telefono: telefono || null })
    .eq('id', id)
    .eq('escuela_id', escuelaId)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ familia })
}
