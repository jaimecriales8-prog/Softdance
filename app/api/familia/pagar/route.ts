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

  const body = await request.json()
  // service client solo para leer config_pagos — tabla no accesible por RLS al rol padre
  const service = createServiceClient()

  const { data: config } = await service
    .from('config_pagos')
    .select('wompi_pub_key, wompi_integrity_secret')
    .eq('escuela_id', perfil.escuela_id)
    .single()

  if (!config?.wompi_pub_key || !config?.wompi_integrity_secret) {
    return NextResponse.json({ error: 'Wompi no configurado' }, { status: 400 })
  }

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://softdance.vercel.app'
  const currency = 'COP'

  // --- Mensualidad ---
  if (body.mensualidad_id) {
    const { data: mens } = await supabase
      .from('mensualidades')
      .select('id, total, familia_id')
      .eq('id', body.mensualidad_id)
      .eq('familia_id', perfil.familia_id)
      .single()
    if (!mens) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const reference = `MENS-${mens.id}`
    const amountCents = Math.round(mens.total * 100)
    const hash = createHash('sha256').update(`${reference}${amountCents}${currency}${config.wompi_integrity_secret}`).digest('hex')
    const params = new URLSearchParams({ 'public-key': config.wompi_pub_key, currency, 'amount-in-cents': String(amountCents), reference, 'redirect-url': `${APP_URL}/familia/mensualidades`, 'signature:integrity': hash })
    return NextResponse.json({ url: `https://checkout.wompi.co/p/?${params.toString()}` })
  }

  // --- Matrícula ---
  if (body.matricula_id) {
    const { data: mat } = await supabase
      .from('matriculas')
      .select('id, valor, familia_id')
      .eq('id', body.matricula_id)
      .eq('familia_id', perfil.familia_id)
      .single()
    if (!mat) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const reference = `MAT-${mat.id}`
    const amountCents = Math.round(mat.valor * 100)
    const hash = createHash('sha256').update(`${reference}${amountCents}${currency}${config.wompi_integrity_secret}`).digest('hex')
    const params = new URLSearchParams({ 'public-key': config.wompi_pub_key, currency, 'amount-in-cents': String(amountCents), reference, 'redirect-url': `${APP_URL}/familia/mensualidades`, 'signature:integrity': hash })
    return NextResponse.json({ url: `https://checkout.wompi.co/p/?${params.toString()}` })
  }

  // --- Evento (cuota) ---
  if (body.evento_alumna_id && body.cuota_numero) {
    // Verificar que la alumna pertenece a esta familia
    const { data: ea } = await supabase
      .from('evento_alumna')
      .select('id, total, cuotas, alumna_id, alumnas!inner(familia_id)')
      .eq('id', body.evento_alumna_id)
      .single()

    const alumnaFamilia = ea ? (Array.isArray((ea as any).alumnas) ? (ea as any).alumnas[0] : (ea as any).alumnas) : null
    if (!ea || alumnaFamilia?.familia_id !== perfil.familia_id) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    const cuotas: { numero: number; estado: string }[] = ea.cuotas ?? []
    const cuota = cuotas.find(c => c.numero === body.cuota_numero)
    if (!cuota || cuota.estado === 'pagado') {
      return NextResponse.json({ error: 'Cuota no válida' }, { status: 400 })
    }

    const montoCuota = Math.round(ea.total / cuotas.length)
    const reference = `EVT-${ea.id}-${body.cuota_numero}`
    const amountCents = montoCuota * 100
    const hash = createHash('sha256').update(`${reference}${amountCents}${currency}${config.wompi_integrity_secret}`).digest('hex')
    const params = new URLSearchParams({ 'public-key': config.wompi_pub_key, currency, 'amount-in-cents': String(amountCents), reference, 'redirect-url': `${APP_URL}/familia/eventos`, 'signature:integrity': hash })
    return NextResponse.json({ url: `https://checkout.wompi.co/p/?${params.toString()}` })
  }

  return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
}
