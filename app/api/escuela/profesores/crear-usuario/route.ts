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

  const { profesor_id, email, password } = await request.json()
  if (!email || !password) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const { data: profesor } = await supabase.from('profesores')
    .select('id, nombre').eq('id', profesor_id).eq('escuela_id', escuelaId).single()
  if (!profesor) return NextResponse.json({ error: 'Profesor no encontrado' }, { status: 404 })

  const service = createServiceClient()

  const { data: authUser, error: authError } = await service.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  await service.from('perfiles').insert({
    id: authUser.user.id,
    nombre: profesor.nombre,
    rol: 'profesor',
    escuela_id: escuelaId,
  })

  const { error: updateError } = await service.from('profesores')
    .update({ email, user_id: authUser.user.id })
    .eq('id', profesor_id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

  enviarBienvenida({ email, nombre: profesor.nombre, password, rol: 'profesor' }).catch(() => {})

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { profesor_id } = await request.json()
  const service = createServiceClient()

  const { data: profesor } = await supabase.from('profesores')
    .select('user_id').eq('id', profesor_id).eq('escuela_id', escuelaId).single()

  if (profesor?.user_id) {
    await service.auth.admin.deleteUser(profesor.user_id)
    await service.from('profesores').update({ user_id: null }).eq('id', profesor_id)
  }

  return NextResponse.json({ ok: true })
}
