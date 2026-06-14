import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import EscuelaDetalleClient from './EscuelaDetalleClient'

export default async function EscuelaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const service = createServiceClient()

  const { data: escuela } = await supabase
    .from('escuelas')
    .select('*')
    .eq('id', id)
    .single()

  if (!escuela) notFound()

  const [{ data: admins }, { data: configPagos }] = await Promise.all([
    service.from('perfiles').select('id, nombre, email, created_at').eq('escuela_id', id).eq('rol', 'admin_escuela'),
    service.from('config_pagos').select('wompi_pub_key, wompi_priv_key, wompi_integrity_secret').eq('escuela_id', id).maybeSingle(),
  ])

  return <EscuelaDetalleClient escuela={escuela} admins={admins ?? []} configPagos={configPagos ?? null} />
}
