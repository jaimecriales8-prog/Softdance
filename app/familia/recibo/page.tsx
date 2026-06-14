import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import ReciboFamiliaClient from './ReciboFamiliaClient'

export default async function FamiliaReciboPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('familia_id, escuela_id').eq('id', user!.id).single()

  const familiaId = perfil!.familia_id
  const escuelaId = perfil!.escuela_id

  const service = createServiceClient()

  const [{ data: familia }, { data: escuela }, { data: configPagos }] = await Promise.all([
    supabase.from('familias').select('id, nombre, email, telefono, alumnas(id, nombre)').eq('id', familiaId).single(),
    supabase.from('escuelas').select('nombre, info_pago, cobro_activo').eq('id', escuelaId).single(),
    service.from('config_pagos').select('wompi_pub_key').eq('escuela_id', escuelaId).maybeSingle(),
  ])

  const tieneWompi = !!configPagos?.wompi_pub_key && escuela?.cobro_activo

  const [{ data: mensualidades }, { data: eventos }] = await Promise.all([
    supabase.from('mensualidades')
      .select('id, periodo, subtotal, descuento, total, estado, fecha_limite, detalle')
      .eq('familia_id', familiaId)
      .order('periodo', { ascending: false }),
    supabase.from('evento_alumna')
      .select('id, estado, total, cuotas, lineas, eventos(nombre, fecha, num_cuotas), alumnas(nombre)')
      .in('alumna_id', (familia?.alumnas as any[] ?? []).map((a: any) => a.id))
      .order('created_at', { ascending: false }),
  ])

  return (
    <ReciboFamiliaClient
      familia={familia as any}
      escuela={escuela!}
      mensualidades={(mensualidades ?? []) as any[]}
      eventos={(eventos ?? []) as any[]}
      tieneWompi={tieneWompi}
      infoPago={escuela?.info_pago ?? null}
    />
  )
}
