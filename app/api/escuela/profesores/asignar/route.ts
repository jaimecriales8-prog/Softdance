import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function getEscuelaId(supabase: any, userId: string) {
  const { data } = await supabase.from('perfiles').select('escuela_id, rol').eq('id', userId).single()
  if (data?.rol !== 'admin_escuela') return null
  return data.escuela_id
}

// POST { profesor_id, grupo_id? , actividad_id? } → asignar
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { profesor_id, grupo_id, actividad_id } = await request.json()

  if (grupo_id) {
    const { error } = await supabase.from('grupo_profesor')
      .upsert({ grupo_id, profesor_id }, { onConflict: 'grupo_id,profesor_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  } else if (actividad_id) {
    const { error } = await supabase.from('actividad_profesor')
      .upsert({ actividad_id, profesor_id }, { onConflict: 'actividad_id,profesor_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE { profesor_id, grupo_id? , actividad_id? } → desasignar
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { profesor_id, grupo_id, actividad_id } = await request.json()

  if (grupo_id) {
    await supabase.from('grupo_profesor').delete().eq('grupo_id', grupo_id).eq('profesor_id', profesor_id)
  } else if (actividad_id) {
    await supabase.from('actividad_profesor').delete().eq('actividad_id', actividad_id).eq('profesor_id', profesor_id)
  }

  return NextResponse.json({ ok: true })
}
