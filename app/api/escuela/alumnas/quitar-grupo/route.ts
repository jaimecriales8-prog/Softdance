import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin_escuela') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { alumna_id, es_elite } = await request.json()
  if (!alumna_id || es_elite === undefined) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })

  const hoy = new Date().toISOString().split('T')[0]

  const { data: gruposActivos } = await supabase
    .from('alumna_grupo')
    .select('id, grupos(es_elite)')
    .eq('alumna_id', alumna_id)
    .eq('activo', true)

  const aQuitar = (gruposActivos ?? []).filter((ag: any) => {
    const g = Array.isArray(ag.grupos) ? ag.grupos[0] : ag.grupos
    return g?.es_elite === es_elite
  })

  if (aQuitar.length === 0) return NextResponse.json({ error: 'No hay grupo activo de ese tipo' }, { status: 400 })

  await supabase.from('alumna_grupo')
    .update({ activo: false, fecha_fin: hoy })
    .in('id', aQuitar.map((ag: any) => ag.id))

  return NextResponse.json({ ok: true })
}
