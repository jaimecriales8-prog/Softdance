import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('perfiles').select('escuela_id, rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin_escuela') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { periodo } = await request.json()
  if (!periodo) return NextResponse.json({ error: 'Falta periodo' }, { status: 400 })

  const escuelaId = perfil.escuela_id
  const service = createServiceClient()

  const [anio, mesStr] = periodo.split('-')
  const mes = parseInt(mesStr)
  const fechaLimite = new Date(parseInt(anio), mes, 5).toISOString().split('T')[0]

  // Verificar que el mes está habilitado
  const { data: escuela } = await service.from('escuelas').select('meses_activos').eq('id', escuelaId).single()
  if (!escuela?.meses_activos?.includes(mes)) {
    return NextResponse.json({ error: 'Este mes no está habilitado para cobro' }, { status: 400 })
  }

  // Obtener alumnas activas no congeladas con sus grupos y actividades
  const { data: alumnas } = await service
    .from('alumnas')
    .select(`
      id, nombre, familia_id, congelada,
      alumna_grupo(activo, grupos(id, nombre, precio_mensual)),
      alumna_actividad(actividades_extra(id, nombre, precio, es_recurrente))
    `)
    .eq('escuela_id', escuelaId)
    .eq('activa', true)
    .eq('congelada', false)

  if (!alumnas?.length) return NextResponse.json({ mensualidades: [] })

  // Agrupar por familia
  const porFamilia: Record<string, any[]> = {}
  for (const a of alumnas) {
    if (!porFamilia[a.familia_id]) porFamilia[a.familia_id] = []
    porFamilia[a.familia_id].push(a)
  }

  const nuevas: any[] = []

  for (const [familia_id, alumnasFamilia] of Object.entries(porFamilia)) {
    // No duplicar si ya existe
    const { data: existe } = await service
      .from('mensualidades')
      .select('id')
      .eq('familia_id', familia_id)
      .eq('periodo', periodo)
      .maybeSingle()

    if (existe) continue

    const detalle: any[] = []
    let subtotal = 0

    for (const alumna of alumnasFamilia) {
      const lineas: any[] = []

      const grupos = (alumna.alumna_grupo ?? [])
        .filter((ag: any) => ag.activo)
        .map((ag: any) => Array.isArray(ag.grupos) ? ag.grupos[0] : ag.grupos)
        .filter(Boolean)

      for (const g of grupos) {
        lineas.push({ concepto: g.nombre, valor: g.precio_mensual })
        subtotal += Number(g.precio_mensual)
      }

      const actividades = (alumna.alumna_actividad ?? [])
        .map((aa: any) => Array.isArray(aa.actividades_extra) ? aa.actividades_extra[0] : aa.actividades_extra)
        .filter((a: any) => a?.es_recurrente)

      for (const a of actividades) {
        lineas.push({ concepto: a.nombre, valor: a.precio })
        subtotal += Number(a.precio)
      }

      if (lineas.length > 0) detalle.push({ alumna: alumna.nombre, lineas })
    }

    if (subtotal === 0) continue

    const { data: nueva } = await service
      .from('mensualidades')
      .insert({
        escuela_id: escuelaId,
        familia_id,
        periodo,
        subtotal,
        descuento: 0,
        total: subtotal,
        estado: 'pendiente',
        fecha_limite: fechaLimite,
        detalle,
      })
      .select('*, familias(nombre, email, telefono)')
      .single()

    if (nueva) nuevas.push(nueva)
  }

  return NextResponse.json({ mensualidades: nuevas, generadas: nuevas.length })
}
