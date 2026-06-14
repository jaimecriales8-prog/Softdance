import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('perfiles').select('escuela_id, rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin_escuela') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { alumna_id, nuevo_grupo_id, escuela_id } = await request.json()
  if (!alumna_id || !nuevo_grupo_id) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })

  const hoy = new Date().toISOString().split('T')[0]

  // Obtener tipo del nuevo grupo (élite o normal)
  const { data: nuevoGrupo } = await supabase.from('grupos').select('es_elite').eq('id', nuevo_grupo_id).single()

  // Cerrar solo el grupo activo del mismo tipo
  const { data: gruposActivos } = await supabase
    .from('alumna_grupo')
    .select('id, grupos(es_elite)')
    .eq('alumna_id', alumna_id)
    .eq('activo', true)

  const mismoTipo = (gruposActivos ?? []).filter((ag: any) => {
    const g = Array.isArray(ag.grupos) ? ag.grupos[0] : ag.grupos
    return g?.es_elite === nuevoGrupo?.es_elite
  })

  if (mismoTipo.length > 0) {
    await supabase.from('alumna_grupo')
      .update({ activo: false, fecha_fin: hoy })
      .in('id', mismoTipo.map((ag: any) => ag.id))
  }

  // Buscar si ya existe un registro para esta alumna+grupo (activo o cerrado hoy)
  const { data: existente } = await supabase
    .from('alumna_grupo')
    .select('id, fecha_inicio, fecha_fin, activo, grupos(id, nombre, es_elite)')
    .eq('alumna_id', alumna_id)
    .eq('grupo_id', nuevo_grupo_id)
    .eq('fecha_inicio', hoy)
    .maybeSingle()

  let alumnaGrupo, error

  if (existente) {
    // Reactivar el registro existente
    const res = await supabase.from('alumna_grupo')
      .update({ activo: true, fecha_fin: null })
      .eq('id', existente.id)
      .select('id, fecha_inicio, fecha_fin, activo, grupos(id, nombre, es_elite)')
      .single()
    alumnaGrupo = res.data
    error = res.error
  } else {
    // Crear nuevo registro
    const res = await supabase.from('alumna_grupo')
      .insert({ escuela_id, alumna_id, grupo_id: nuevo_grupo_id, fecha_inicio: hoy, activo: true })
      .select('id, fecha_inicio, fecha_fin, activo, grupos(id, nombre, es_elite)')
      .single()
    alumnaGrupo = res.data
    error = res.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ alumna_grupo: alumnaGrupo })
}
