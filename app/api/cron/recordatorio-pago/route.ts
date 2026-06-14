import { createServiceClient } from '@/lib/supabase/service'
import { enviarRecordatorioPago } from '@/lib/email'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Buscar mensualidades pendientes cuya fecha_limite es exactamente en 3 días
  const en3dias = new Date()
  en3dias.setDate(en3dias.getDate() + 3)
  const fechaTarget = en3dias.toISOString().split('T')[0]

  const { data: mensualidades } = await supabase
    .from('mensualidades')
    .select('id, familia_id, periodo, total, fecha_limite, familias(nombre, email)')
    .eq('estado', 'pendiente')
    .eq('fecha_limite', fechaTarget)

  if (!mensualidades?.length) return NextResponse.json({ ok: true, enviados: 0 })

  let enviados = 0

  for (const m of mensualidades) {
    const familia = Array.isArray(m.familias) ? m.familias[0] : m.familias as any
    if (!familia?.email) continue

    enviarRecordatorioPago({
      email: familia.email,
      nombreFamilia: familia.nombre,
      periodo: m.periodo,
      total: m.total,
      fechaLimite: m.fecha_limite!,
    }).catch(() => {})

    enviados++
  }

  return NextResponse.json({ ok: true, fecha: fechaTarget, enviados })
}
