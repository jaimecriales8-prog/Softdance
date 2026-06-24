import { createClient } from '@/lib/supabase/server'
import ActividadesClient from './ActividadesClient'

export default async function ActividadesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('escuela_id').eq('id', user!.id).single()
  const escuelaId = perfil!.escuela_id

  const [{ data: actividades }, { data: alumnas }] = await Promise.all([
    supabase.from('actividades_extra').select('*').eq('escuela_id', escuelaId).order('nombre'),
    supabase.from('alumnas')
      .select('id, nombre, fecha_nacimiento, alumna_actividad(actividad_id)')
      .eq('escuela_id', escuelaId)
      .eq('activa', true)
      .order('nombre'),
  ])

  return <ActividadesClient actividades={actividades ?? []} alumnas={(alumnas ?? []) as any} escuelaId={escuelaId} />
}
