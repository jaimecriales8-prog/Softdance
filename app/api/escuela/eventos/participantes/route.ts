import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function getEscuelaId(supabase: any, userId: string) {
  const { data } = await supabase.from('perfiles').select('escuela_id, rol').eq('id', userId).single()
  if (data?.rol !== 'admin_escuela') return null
  return data.escuela_id
}

// POST { evento_id, alumna_id } → agregar participante
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { evento_id, alumna_id } = await request.json()

  const { data, error } = await supabase.from('evento_alumna')
    .upsert({ escuela_id: escuelaId, evento_id, alumna_id, estado: 'pendiente' }, { onConflict: 'evento_id,alumna_id' })
    .select('id, estado, alumnas(id, nombre, familias(nombre))')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ participante: data })
}

// DELETE { evento_id, alumna_id } → quitar participante
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { evento_id, alumna_id } = await request.json()

  await supabase.from('evento_alumna')
    .delete()
    .eq('evento_id', evento_id)
    .eq('alumna_id', alumna_id)
    .eq('escuela_id', escuelaId)

  return NextResponse.json({ ok: true })
}

// PATCH { evento_id, alumna_id, estado } → marcar pagado
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { evento_id, alumna_id, estado } = await request.json()

  const { data, error } = await supabase.from('evento_alumna')
    .update({ estado })
    .eq('evento_id', evento_id)
    .eq('alumna_id', alumna_id)
    .eq('escuela_id', escuelaId)
    .select('id, estado, alumnas(id, nombre, familias(nombre))')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ participante: data })
}
