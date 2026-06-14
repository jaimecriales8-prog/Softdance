import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

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
      .select('wompi_integrity_secret')
      .eq('escuela_id', escuelaId)
      .single()
    if (!config?.wompi_integrity_secret) return true // sin config, dejar pasar
    const values = properties.map((p: string) => {
      if (p === 'transaction.id') return data.id
      if (p === 'transaction.status') return status
      if (p === 'transaction.amount_in_cents') return amount_in_cents
      return ''
    }).join('')
    const expected = createHash('sha256').update(values + config.wompi_integrity_secret).digest('hex')
    return expected === checksum
  }

  // --- MENS-{id} ---
  if (reference?.startsWith('MENS-')) {
    const id = reference.replace('MENS-', '')
    const { data: mens } = await service.from('mensualidades').select('id, escuela_id').eq('id', id).single()
    if (!mens) return NextResponse.json({ ok: true })
    if (!await verificarFirma(mens.escuela_id)) return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })
    if (status === 'APPROVED') {
      await service.from('mensualidades').update({ estado: 'pagado' }).eq('id', id)
    }
    return NextResponse.json({ ok: true })
  }

  // --- MAT-{id} ---
  if (reference?.startsWith('MAT-')) {
    const id = reference.replace('MAT-', '')
    const { data: mat } = await service.from('matriculas').select('id, escuela_id').eq('id', id).single()
    if (!mat) return NextResponse.json({ ok: true })
    if (!await verificarFirma(mat.escuela_id)) return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })
    if (status === 'APPROVED') {
      await service.from('matriculas').update({ estado: 'pagado' }).eq('id', id)
    }
    return NextResponse.json({ ok: true })
  }

  // --- EVT-{evento_alumna_id}-{cuota_numero} ---
  if (reference?.startsWith('EVT-')) {
    const parts = reference.replace('EVT-', '').split('-')
    // evento_alumna id es UUID (contiene guiones), cuota_numero es el último segmento
    const cuotaNumero = parseInt(parts[parts.length - 1])
    const eventoAlumnaId = parts.slice(0, parts.length - 1).join('-')

    const { data: ea } = await service
      .from('evento_alumna')
      .select('id, escuela_id, cuotas, total')
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
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}
