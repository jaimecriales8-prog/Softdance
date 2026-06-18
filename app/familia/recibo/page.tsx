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

  const alumnaIds = (familia?.alumnas as any[] ?? []).map((a: any) => a.id)
  const dummyId = '00000000-0000-0000-0000-000000000000'

  const [{ data: mensualidades }, { data: eventos }, { data: matriculas }, { data: actividadesAlumnas }] = await Promise.all([
    supabase.from('mensualidades')
      .select('id, periodo, subtotal, descuento, total, estado, fecha_limite, detalle')
      .eq('familia_id', familiaId)
      .order('periodo', { ascending: false }),
    supabase.from('evento_alumna')
      .select('id, estado, total, cuotas, lineas, eventos(nombre, fecha, num_cuotas), alumnas(nombre)')
      .in('alumna_id', alumnaIds.length > 0 ? alumnaIds : [dummyId])
      .order('created_at', { ascending: false }),
    supabase.from('matriculas')
      .select('id, anio, valor, estado')
      .eq('familia_id', familiaId)
      .order('anio', { ascending: false }),
    alumnaIds.length > 0
      ? supabase.from('alumna_actividad')
          .select('id, alumna_id, actividades_extra(id, nombre, precio, es_recurrente), alumnas(nombre)')
          .in('alumna_id', alumnaIds)
      : Promise.resolve({ data: [] as any[], error: null }),
  ])

  return (
    <ReciboFamiliaClient
      familia={familia as any}
      escuela={escuela!}
      mensualidades={(mensualidades ?? []) as any[]}
      eventos={(eventos ?? []) as any[]}
      matriculas={(matriculas ?? []) as any[]}
      actividadesAlumnas={(actividadesAlumnas ?? []) as any[]}
      tieneWompi={tieneWompi}
      infoPago={escuela?.info_pago ?? null}
    />
  )
}
