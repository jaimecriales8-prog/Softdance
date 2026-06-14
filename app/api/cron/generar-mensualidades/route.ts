import { createServiceClient } from '@/lib/supabase/service'
import { enviarNuevaMensualidad } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const ahora = new Date()
  const mes = ahora.getMonth() + 1
  const anio = ahora.getFullYear()
  const periodo = `${anio}-${String(mes).padStart(2, '0')}`
  const fechaLimite = new Date(anio, mes, 5).toISOString().split('T')[0] // día 5 del mes siguiente

  const { data: escuelas } = await supabase
    .from('escuelas')
    .select('id, meses_activos')
    .eq('activa', true)
    .contains('meses_activos', [mes])

  if (!escuelas?.length) return NextResponse.json({ ok: true, generadas: 0 })

  let totalGeneradas = 0

  for (const escuela of escuelas) {
    const { data: alumnas } = await supabase
      .from('alumnas')
      .select(`
        id, nombre, familia_id, congelada,
        alumna_grupo(activo, grupos(id, nombre, precio_mensual)),
        alumna_actividad(activo, actividades_extra(id, nombre, precio, es_recurrente))
      `)
      .eq('escuela_id', escuela.id)
      .eq('activa', true)
      .eq('congelada', false)

    if (!alumnas?.length) continue

    // Agrupar por familia
    const porFamilia: Record<string, any[]> = {}
    for (const a of alumnas) {
      if (!porFamilia[a.familia_id]) porFamilia[a.familia_id] = []
      porFamilia[a.familia_id].push(a)
    }

    // Obtener emails de todas las familias de esta escuela
    const familiaIds = Object.keys(porFamilia)
    const { data: familias } = await supabase
      .from('familias')
      .select('id, nombre, email')
      .in('id', familiaIds)

    const familiaMap: Record<string, { nombre: string; email: string }> = {}
    for (const f of familias ?? []) familiaMap[f.id] = { nombre: f.nombre, email: f.email }

    for (const [familia_id, alumnasFamilia] of Object.entries(porFamilia)) {
      const { data: existe } = await supabase
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
          subtotal += g.precio_mensual
        }

        const actividades = (alumna.alumna_actividad ?? [])
          .filter((aa: any) => aa.activo !== false)
          .map((aa: any) => Array.isArray(aa.actividades_extra) ? aa.actividades_extra[0] : aa.actividades_extra)
          .filter((a: any) => a?.es_recurrente)

        for (const a of actividades) {
          lineas.push({ concepto: a.nombre, valor: a.precio })
          subtotal += a.precio
        }

        if (lineas.length > 0) {
          detalle.push({ alumna: alumna.nombre, lineas })
        }
      }

      if (subtotal === 0) continue

      await supabase.from('mensualidades').insert({
        escuela_id: escuela.id,
        familia_id,
        periodo,
        subtotal,
        descuento: 0,
        total: subtotal,
        estado: 'pendiente',
        fecha_limite: fechaLimite,
        detalle,
      })

      totalGeneradas++

      // Notificar a la familia por email (fire-and-forget)
      const familia = familiaMap[familia_id]
      if (familia?.email) {
        enviarNuevaMensualidad({
          email: familia.email,
          nombreFamilia: familia.nombre,
          periodo,
          total: subtotal,
          fechaLimite,
          detalle,
        }).catch(() => {})
      }
    }
  }

  return NextResponse.json({ ok: true, periodo, generadas: totalGeneradas })
}
