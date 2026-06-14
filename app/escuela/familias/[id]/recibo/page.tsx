import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ReciboClient from './ReciboClient'

export default async function ReciboPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('escuela_id').eq('id', user!.id).single()
  const escuelaId = perfil!.escuela_id

  const [{ data: familia }, { data: escuela }] = await Promise.all([
    supabase.from('familias')
      .select('id, nombre, email, telefono, alumnas(id, nombre, congelada, alumna_grupo(activo, grupos(nombre, precio_mensual)), alumna_actividad(activo, actividades_extra(nombre, precio, es_recurrente)))')
      .eq('id', id).eq('escuela_id', escuelaId).single(),
    supabase.from('escuelas').select('nombre').eq('id', escuelaId).single(),
  ])

  if (!familia) notFound()

  const [{ data: mensualidades }, { data: eventos }] = await Promise.all([
    supabase.from('mensualidades')
      .select('id, periodo, subtotal, descuento, total, estado, fecha_limite, detalle')
      .eq('familia_id', id)
      .order('periodo', { ascending: false }),
    supabase.from('evento_alumna')
      .select('id, estado, total, cuotas, lineas, evento_id, eventos(nombre, fecha, num_cuotas), alumnas(nombre)')
      .in('alumna_id', (familia.alumnas as any[]).map((a: any) => a.id))
      .order('created_at', { ascending: false }),
  ])

  return (
    <ReciboClient
      familia={familia as any}
      escuela={escuela!}
      mensualidades={(mensualidades ?? []) as any[]}
      eventos={(eventos ?? []) as any[]}
    />
  )
}
