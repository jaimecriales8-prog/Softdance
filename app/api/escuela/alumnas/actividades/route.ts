import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function getEscuelaId(supabase: any, userId: string) {
  const { data } = await supabase.from('perfiles').select('escuela_id, rol').eq('id', userId).single()
  if (data?.rol !== 'admin_escuela') return null
  return data.escuela_id
}

// POST { alumna_id, actividad_id } → asigna actividad a alumna
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { alumna_id, actividad_id } = await request.json()
  if (!alumna_id || !actividad_id) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })

  const fecha_inicio = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('alumna_actividad')
    .upsert(
      { escuela_id: escuelaId, alumna_id, actividad_id, activa: true, fecha_inicio },
      { onConflict: 'alumna_id,actividad_id,fecha_inicio' }
    )
    .select('id, actividades_extra(id, nombre, precio, es_recurrente)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ alumna_actividad: data })
}

// DELETE { alumna_id, actividad_id } → desasigna actividad
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { alumna_id, actividad_id } = await request.json()

  const { error } = await supabase
    .from('alumna_actividad')
    .delete()
    .eq('alumna_id', alumna_id)
    .eq('actividad_id', actividad_id)
    .eq('escuela_id', escuelaId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
