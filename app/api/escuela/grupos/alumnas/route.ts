import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function getEscuelaId(supabase: any, userId: string) {
  const { data } = await supabase.from('perfiles').select('escuela_id, rol').eq('id', userId).single()
  if (data?.rol !== 'admin_escuela') return null
  return data.escuela_id
}

// GET ?grupo_id=xxx → alumnas activas en ese grupo
// GET ?grupo_id=xxx&disponibles=1 → alumnas de la escuela NO en ese grupo
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const grupoId = request.nextUrl.searchParams.get('grupo_id')
  const disponibles = request.nextUrl.searchParams.get('disponibles')
  if (!grupoId) return NextResponse.json({ error: 'Falta grupo_id' }, { status: 400 })

  if (disponibles) {
    // Alumnas de la escuela que NO están actualmente en este grupo
    const { data: enGrupo } = await supabase
      .from('alumna_grupo')
      .select('alumna_id')
      .eq('grupo_id', grupoId)
      .eq('activo', true)

    const idsEnGrupo = (enGrupo ?? []).map((r: any) => r.alumna_id)

    let query = supabase
      .from('alumnas')
      .select('id, nombre, fecha_nacimiento, familias(nombre)')
      .eq('escuela_id', escuelaId)
      .eq('activa', true)
      .order('nombre')

    if (idsEnGrupo.length > 0) {
      query = query.not('id', 'in', `(${idsEnGrupo.join(',')})`)
    }

    const { data } = await query
    return NextResponse.json({ alumnas: data ?? [] })
  }

  // Alumnas activas en este grupo
  const { data } = await supabase
    .from('alumna_grupo')
    .select('id, fecha_inicio, alumnas(id, nombre, fecha_nacimiento, familias(nombre))')
    .eq('grupo_id', grupoId)
    .eq('escuela_id', escuelaId)
    .eq('activo', true)
    .order('fecha_inicio')

  return NextResponse.json({ alumnas: data ?? [] })
}

// POST { alumna_id, grupo_id } → agrega alumna al grupo (cierra el actual si tiene)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { alumna_id, grupo_id } = await request.json()
  if (!alumna_id || !grupo_id) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })

  // Cerrar grupo actual si tiene
  await supabase
    .from('alumna_grupo')
    .update({ activo: false, fecha_fin: new Date().toISOString().split('T')[0] })
    .eq('alumna_id', alumna_id)
    .eq('activo', true)

  const { data, error } = await supabase
    .from('alumna_grupo')
    .insert({ escuela_id: escuelaId, alumna_id, grupo_id, fecha_inicio: new Date().toISOString().split('T')[0], activo: true })
    .select('id, fecha_inicio, alumnas(id, nombre, fecha_nacimiento, familias(nombre))')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ alumna_grupo: data })
}

// DELETE { alumna_id, grupo_id } → remueve alumna del grupo (cierra registro)
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { alumna_id, grupo_id } = await request.json()

  await supabase
    .from('alumna_grupo')
    .update({ activo: false, fecha_fin: new Date().toISOString().split('T')[0] })
    .eq('alumna_id', alumna_id)
    .eq('grupo_id', grupo_id)
    .eq('activo', true)

  return NextResponse.json({ ok: true })
}
