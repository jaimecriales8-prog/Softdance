import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import DashboardClient from './DashboardClient'

export default async function EscuelaDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('escuela_id').eq('id', user!.id).single()
  const escuelaId = perfil?.escuela_id

  const service = createServiceClient()

  const [
    { count: totalGrupos },
    { count: totalFamilias },
    { count: totalAlumnas },
    { data: escuela },
    { data: configPagos },
  ] = await Promise.all([
    supabase.from('grupos').select('*', { count: 'exact', head: true }).eq('escuela_id', escuelaId),
    supabase.from('familias').select('*', { count: 'exact', head: true }).eq('escuela_id', escuelaId),
    supabase.from('alumnas').select('*', { count: 'exact', head: true }).eq('escuela_id', escuelaId),
    supabase.from('escuelas').select('id, nombre, info_pago').eq('id', escuelaId).single(),
    service.from('config_pagos').select('wompi_pub_key').eq('escuela_id', escuelaId).maybeSingle(),
  ])

  return (
    <DashboardClient
      stats={{ grupos: totalGrupos ?? 0, familias: totalFamilias ?? 0, alumnas: totalAlumnas ?? 0 }}
      escuela={escuela as any}
      tieneWompi={!!configPagos?.wompi_pub_key}
    />
  )
}
