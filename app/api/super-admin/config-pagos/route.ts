import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

async function checkSuperAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from('perfiles').select('rol').eq('id', userId).single()
  return data?.rol === 'super_admin'
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await checkSuperAdmin(supabase, user.id)))
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { escuela_id, wompi_pub_key, wompi_priv_key, wompi_integrity_secret } = await request.json()

  const service = createServiceClient()
  const { error } = await service.from('config_pagos').upsert(
    { escuela_id, wompi_pub_key, wompi_priv_key, wompi_integrity_secret },
    { onConflict: 'escuela_id' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
