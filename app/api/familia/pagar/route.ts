import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('perfiles').select('familia_id, escuela_id').eq('id', user.id).single()
  if (!perfil?.familia_id) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { mensualidad_id } = await request.json()

  const { data: mensualidad } = await supabase
    .from('mensualidades')
    .select('id, total, periodo, familia_id')
    .eq('id', mensualidad_id)
    .eq('familia_id', perfil.familia_id)
    .single()

  if (!mensualidad) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const service = createServiceClient()
  const { data: config } = await service
    .from('config_pagos')
    .select('wompi_pub_key, wompi_integrity_secret')
    .eq('escuela_id', perfil.escuela_id)
    .single()

  if (!config?.wompi_pub_key || !config?.wompi_integrity_secret) {
    return NextResponse.json({ error: 'Wompi no configurado' }, { status: 400 })
  }

  const reference = `MENS-${mensualidad.id}`
  const amountCents = Math.round(mensualidad.total * 100)
  const currency = 'COP'
  const redirectUrl = `${process.env.NEXT_PUBLIC_URL ?? 'https://softdance.vercel.app'}/familia/mensualidades`

  const hash = createHash('sha256')
    .update(`${reference}${amountCents}${currency}${config.wompi_integrity_secret}`)
    .digest('hex')

  const params = new URLSearchParams({
    'public-key': config.wompi_pub_key,
    currency,
    'amount-in-cents': String(amountCents),
    reference,
    'redirect-url': redirectUrl,
    'signature:integrity': hash,
  })

  return NextResponse.json({ url: `https://checkout.wompi.co/p/?${params.toString()}` })
}
