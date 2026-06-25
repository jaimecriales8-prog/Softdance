import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import FamiliaDetalleClient from './FamiliaDetalleClient'

export default async function FamiliaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('escuela_id').eq('id', user!.id).single()
  const escuelaId = perfil!.escuela_id

  const { data: familia } = await supabase
    .from('familias')
    .select('*')
    .eq('id', id)
    .eq('escuela_id', escuelaId)
    .single()

  if (!familia) notFound()

  const { data: alumnas } = await supabase
    .from('alumnas')
    .select(`
      id, nombre, documento, fecha_nacimiento, foto_url, activa, congelada, notas, codigo_vinculacion,
      alumna_grupo(id, fecha_inicio, fecha_fin, activo, tipo_asistencia, grupos(id, nombre, es_elite, precio_mensual, precio_media, precio_cuarto)),
      alumna_actividad(id, actividades_extra(id, nombre, precio, es_recurrente))
    `)
    .eq('familia_id', id)
    .eq('escuela_id', escuelaId)
    .order('nombre')

  const { data: grupos } = await supabase
    .from('grupos')
    .select('id, nombre, es_elite, precio_mensual, precio_media, precio_cuarto')
    .eq('escuela_id', escuelaId)
    .eq('activo', true)
    .order('es_elite').order('nombre')

  const [{ data: actividades }, { data: eventos }, { data: eventoAlumnas }] = await Promise.all([
    supabase.from('actividades_extra').select('id, nombre, precio, es_recurrente').eq('escuela_id', escuelaId).eq('activa', true).order('nombre'),
    supabase.from('eventos').select('id, nombre, fecha, num_cuotas, conceptos').eq('escuela_id', escuelaId).order('fecha', { ascending: false }),
    supabase.from('evento_alumna').select('evento_id, alumna_id, id').in('alumna_id', (alumnas ?? []).map(a => a.id)),
  ])

  return (
    <FamiliaDetalleClient
      familia={familia}
      alumnas={(alumnas ?? []) as any[]}
      grupos={grupos ?? []}
      actividades={actividades ?? []}
      eventos={eventos ?? []}
      eventoAlumnasIniciales={eventoAlumnas ?? []}
      escuelaId={escuelaId}
    />
  )
}
