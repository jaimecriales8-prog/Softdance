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

  const mismTipo = (gruposActivos ?? []).filter((ag: any) => {
    const g = Array.isArray(ag.grupos) ? ag.grupos[0] : ag.grupos
    return g?.es_elite === nuevoGrupo?.es_elite
  })

  if (mismTipo.length > 0) {
    await supabase.from('alumna_grupo')
      .update({ activo: false, fecha_fin: hoy })
      .in('id', mismTipo.map((ag: any) => ag.id))
  }

  // Abrir nuevo grupo
  const { data: alumnaGrupo, error } = await supabase.from('alumna_grupo').insert({
    escuela_id,
    alumna_id,
    grupo_id: nuevo_grupo_id,
    fecha_inicio: hoy,
    activo: true,
  }).select(`id, fecha_inicio, fecha_fin, activo, grupos(id, nombre, es_elite)`).single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ alumna_grupo: alumnaGrupo })
}
