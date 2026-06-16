import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

async function getEscuelaId(supabase: any, userId: string) {
  const { data } = await supabase.from('perfiles').select('escuela_id, rol').eq('id', userId).single()
  if (data?.rol !== 'admin_escuela') return null
  return data.escuela_id
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { data } = await supabase.from('profesores')
    .select('*, grupo_profesor(grupo_id, grupos(nombre, es_elite)), actividad_profesor(actividad_id, actividades_extra(nombre))')
    .eq('escuela_id', escuelaId)
    .order('nombre')

  return NextResponse.json({ profesores: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { nombre, telefono, email } = await request.json()
  if (!nombre) return NextResponse.json({ error: 'Falta nombre' }, { status: 400 })

  const { data, error } = await supabase.from('profesores')
    .insert({ escuela_id: escuelaId, nombre, telefono: telefono || null, email: email || null })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ profesor: data })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const { data: profesor } = await supabase.from('profesores')
    .select('user_id').eq('id', id).eq('escuela_id', escuelaId).single()
  if (!profesor) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  if (profesor.user_id) {
    const service = createServiceClient()
    await service.auth.admin.deleteUser(profesor.user_id)
  }

  await supabase.from('grupo_profesor').delete().eq('profesor_id', id)
  await supabase.from('actividad_profesor').delete().eq('profesor_id', id)
  const { error } = await supabase.from('profesores').delete().eq('id', id).eq('escuela_id', escuelaId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id, nombre, telefono, email, activa } = await request.json()
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const { data, error } = await supabase.from('profesores')
    .update({ nombre, telefono: telefono || null, email: email || null, activa })
    .eq('id', id).eq('escuela_id', escuelaId)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ profesor: data })
}
