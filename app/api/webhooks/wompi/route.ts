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

  const { reference, status, amount_in_cents, currency, signature } = data
  const checksum = body?.signature?.checksum
  const properties = body?.signature?.properties ?? []

  // Verificar firma de Wompi
  const service = createServiceClient()

  // Extraer escuela del reference para obtener el integrity secret
  // reference format: MENS-{uuid} o EVENTO-{uuid}
  const isMens = reference?.startsWith('MENS-')
  const isEvento = reference?.startsWith('EVENTO-')

  if (!isMens && !isEvento) return NextResponse.json({ ok: true })

  const recordId = reference.replace(/^(MENS|EVENTO)-/, '')

  if (isMens) {
    const { data: mens } = await service
      .from('mensualidades')
      .select('id, escuela_id')
      .eq('id', recordId)
      .single()

    if (!mens) return NextResponse.json({ ok: true })

    const { data: config } = await service
      .from('config_pagos')
      .select('wompi_integrity_secret')
      .eq('escuela_id', mens.escuela_id)
      .single()

    if (config?.wompi_integrity_secret) {
      const values = properties.map((p: string) => {
        if (p === 'transaction.id') return data.id
        if (p === 'transaction.status') return status
        if (p === 'transaction.amount_in_cents') return amount_in_cents
        return ''
      }).join('')
      const expected = createHash('sha256').update(values + config.wompi_integrity_secret).digest('hex')
      if (expected !== checksum) return NextResponse.json({ error: 'Firma inválida' }, { status: 400 })
    }

    if (status === 'APPROVED') {
      await service.from('mensualidades').update({ estado: 'pagado' }).eq('id', recordId)
    }
  }

  return NextResponse.json({ ok: true })
}
