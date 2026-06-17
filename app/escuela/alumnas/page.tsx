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
      id, nombre, fecha_nacimiento, activa, congelada, codigo_vinculacion,
      familias(id, nombre, email, telefono),
      alumna_grupo(activo, grupos(id, nombre, es_elite)),
      alumna_actividad(actividades_extra(id, nombre))
    `)
    .eq('escuela_id', escuelaId)
    .order('nombre')

  const { data: grupos } = await supabase
    .from('grupos')
    .select('id, nombre, es_elite')
    .eq('escuela_id', escuelaId)
    .order('nombre')

  return <AlumnasClient alumnas={alumnas ?? []} grupos={grupos ?? []} />
}
