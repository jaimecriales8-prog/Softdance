import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { enviarConfirmacionPago } from '@/lib/email'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const event = body?.event
  const data = body?.data?.transaction

  if (event !== 'transaction.updated' || !data) {
    return NextResponse.json({ ok: true })
  }

  const { reference, status, amount_in_cents } = data
  const checksum = body?.signature?.checksum
  const properties = body?.signature?.properties ?? []

  const service = createServiceClient()

  async function verificarFirma(escuelaId: string) {
    const { data: config } = await service
      .from('config_pagos')
      .select('wompi_integrity_secret, wompi_events_key')
      .eq('escuela_id', escuelaId)
      .single()
    // Usar events_key para verificar webhook; fallback a integrity_secret para compatibilidad
    const secret = config?.wompi_events_key || config?.wompi_integrity_secret
    if (!secret) return false
    const values = properties.map((p: string) => {
      if (p === 'transaction.id') return data.id
      if (p === 'transaction.status') return status
      if (p === 'transaction.amount_in_cents') return amount_in_cents
      return ''
    }).join('')
    const timestamp = String(body?.timestamp ?? '')
    const expected = createHash('sha256').update(values + timestamp + secret).digest('hex')
    return expected === checksum
  }

  // --- MENS-{id} ---
  if (reference?.startsWith('MENS-')) {
    const id = reference.replace('MENS-', '')
    const { data: mens } = await service
      .from('mensualidades')
      .select('id, escuela_id, periodo, total, familia_id, familias(nombre, email)')
      .eq('id', id)
      .single()
    if (!mens) return NextResponse.json({ ok: true })
    if (!await verificarFirma(mens.escuela_id)) return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })
    if (status === 'APPROVED') {
      await service.from('mensualidades').update({ estado: 'pagado' }).eq('id', id)
      const fam = Array.isArray(mens.familias) ? mens.familias[0] : mens.familias
      if (fam?.email) {
        const [a, m] = mens.periodo.split('-').map(Number)
        const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
        enviarConfirmacionPago({ email: fam.email, nombreFamilia: fam.nombre, concepto: `Mensualidad ${MESES[m]} ${a}`, monto: mens.total }).catch(() => {})
      }
    }
    return NextResponse.json({ ok: true })
  }

  // --- MAT-{id} ---
  if (reference?.startsWith('MAT-')) {
    const id = reference.replace('MAT-', '')
    const { data: mat } = await service
      .from('matriculas')
      .select('id, escuela_id, anio, valor, familia_id, familias(nombre, email)')
      .eq('id', id)
      .single()
    if (!mat) return NextResponse.json({ ok: true })
    if (!await verificarFirma(mat.escuela_id)) return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })
    if (status === 'APPROVED') {
      await service.from('matriculas').update({ estado: 'pagado' }).eq('id', id)
      const fam = Array.isArray(mat.familias) ? mat.familias[0] : mat.familias
      if (fam?.email) {
        enviarConfirmacionPago({ email: fam.email, nombreFamilia: fam.nombre, concepto: `Matrícula ${mat.anio}`, monto: mat.valor }).catch(() => {})
      }
    }
    return NextResponse.json({ ok: true })
  }

  // --- EVT-{evento_alumna_id}-{cuota_numero} ---
  if (reference?.startsWith('EVT-')) {
    const match = reference.match(/^EVT-([a-f0-9-]{36})-(\d+)$/)
    if (!match) return NextResponse.json({ ok: true })
    const eventoAlumnaId = match[1]
    const cuotaNumero = parseInt(match[2])

    const { data: ea } = await service
      .from('evento_alumna')
      .select('id, escuela_id, cuotas, total, eventos(nombre), alumnas(nombre, familias(nombre, email))')
      .eq('id', eventoAlumnaId)
      .single()

    if (!ea) return NextResponse.json({ ok: true })
    if (!await verificarFirma(ea.escuela_id)) return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })

    if (status === 'APPROVED') {
      const cuotas = ((ea.cuotas ?? []) as { numero: number; estado: string }[])
        .map(c => c.numero === cuotaNumero ? { ...c, estado: 'pagado' } : c)
      const todasPagadas = cuotas.every(c => c.estado === 'pagado')
      await service.from('evento_alumna')
        .update({ cuotas, estado: todasPagadas ? 'pagado' : 'pendiente' })
        .eq('id', eventoAlumnaId)
      const alumna = Array.isArray(ea.alumnas) ? ea.alumnas[0] : ea.alumnas
      const fam = alumna ? (Array.isArray(alumna.familias) ? alumna.familias[0] : alumna.familias) : null
      const evento = Array.isArray(ea.eventos) ? ea.eventos[0] : ea.eventos
      if (fam?.email && evento) {
        const montoCuota = Math.round(ea.total / cuotas.length)
        const numCuotas = cuotas.length
        const concepto = numCuotas > 1 ? `${evento.nombre} — cuota ${cuotaNumero}/${numCuotas}` : evento.nombre
        enviarConfirmacionPago({ email: fam.email, nombreFamilia: fam.nombre, concepto, monto: montoCuota }).catch(() => {})
      }
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}
