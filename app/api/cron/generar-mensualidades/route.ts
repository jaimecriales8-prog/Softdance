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
        id, nombre, familia_id, congelada, descuento_mensual,
        alumna_grupo(activo, tipo_asistencia, grupos(id, nombre, precio_mensual, precio_media, precio_cuarto)),
        alumna_actividad(activo, tipo_asistencia, actividades_extra(id, nombre, precio, precio_media, precio_cuarto, es_recurrente))
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
          .map((ag: any) => ({
            grupo: Array.isArray(ag.grupos) ? ag.grupos[0] : ag.grupos,
            tipo_asistencia: ag.tipo_asistencia ?? 'completo',
          }))
          .filter((ag: any) => ag.grupo)

        for (const { grupo: g, tipo_asistencia } of grupos) {
          const esMedia = tipo_asistencia === 'media' && g.precio_media != null
          const esCuarto = tipo_asistencia === 'cuarto' && g.precio_cuarto != null
          const valor = esCuarto ? g.precio_cuarto : esMedia ? g.precio_media : g.precio_mensual
          const concepto = esCuarto ? `${g.nombre} (¼ asistencia)` : esMedia ? `${g.nombre} (½ asistencia)` : g.nombre
          lineas.push({ concepto, valor })
          subtotal += valor
        }

        const actividades = (alumna.alumna_actividad ?? [])
          .filter((aa: any) => aa.activo !== false)
          .map((aa: any) => ({
            act: Array.isArray(aa.actividades_extra) ? aa.actividades_extra[0] : aa.actividades_extra,
            tipo_asistencia: aa.tipo_asistencia ?? 'completo',
          }))
          .filter((aa: any) => aa.act?.es_recurrente)

        for (const { act: a, tipo_asistencia } of actividades) {
          const esMedia = tipo_asistencia === 'media' && a.precio_media != null
          const esCuarto = tipo_asistencia === 'cuarto' && a.precio_cuarto != null
          const valor = esCuarto ? a.precio_cuarto : esMedia ? a.precio_media : a.precio
          const concepto = esCuarto ? `${a.nombre} (¼)` : esMedia ? `${a.nombre} (½)` : a.nombre
          lineas.push({ concepto, valor })
          subtotal += valor
        }

        if (lineas.length > 0) {
          // Descuento fijo por alumna
          const descuentoAlumna = alumna.descuento_mensual ? Number(alumna.descuento_mensual) : 0
          if (descuentoAlumna > 0) {
            lineas.push({ concepto: 'Descuento', valor: -descuentoAlumna })
          }
          detalle.push({ alumna: alumna.nombre, lineas })
        }
      }

      if (subtotal === 0) continue

      // Acumular descuentos de todas las alumnas de esta familia
      let totalDescuento = 0
      for (const alumna of alumnasFamilia) {
        if (alumna.descuento_mensual) totalDescuento += Number(alumna.descuento_mensual)
      }
      const totalConDescuento = Math.max(0, subtotal - totalDescuento)

      await supabase.from('mensualidades').insert({
        escuela_id: escuela.id,
        familia_id,
        periodo,
        subtotal,
        descuento: totalDescuento,
        total: totalConDescuento,
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
          total: totalConDescuento,
          fechaLimite,
          detalle,
        }).catch(() => {})
      }
    }
  }

  return NextResponse.json({ ok: true, periodo, generadas: totalGeneradas })
}
