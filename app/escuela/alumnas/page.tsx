import { createClient } from '@/lib/supabase/server'
import AlumnasClient from './AlumnasClient'

export default async function AlumnasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('escuela_id').eq('id', user!.id).single()
  const escuelaId = perfil?.escuela_id

  const { data: alumnas } = await supabase
    .from('alumnas')
    .select(`
      id, nombre, fecha_nacimiento, activa, congelada, codigo_vinculacion, descuento_mensual,
      familias(id, nombre, email, telefono),
      alumna_grupo(activo, tipo_asistencia, grupos(id, nombre, es_elite)),
      alumna_actividad(actividades_extra(id, nombre))
    `)
    .eq('escuela_id', escuelaId)
    .order('nombre')

  const [{ data: grupos }, { data: familias }, { data: actividades }] = await Promise.all([
    supabase.from('grupos').select('id, nombre, es_elite, precio_media, precio_cuarto').eq('escuela_id', escuelaId).eq('activo', true).order('nombre'),
    supabase.from('familias').select('id, nombre').eq('escuela_id', escuelaId).eq('activa', true).order('nombre'),
    supabase.from('actividades_extra').select('id, nombre, es_recurrente').eq('escuela_id', escuelaId).eq('activa', true).order('nombre'),
  ])

  return <AlumnasClient alumnas={(alumnas ?? []) as any} grupos={grupos ?? []} familias={familias ?? []} actividades={actividades ?? []} escuelaId={escuelaId!} />
}
