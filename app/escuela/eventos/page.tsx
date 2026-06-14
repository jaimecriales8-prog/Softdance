import { createClient } from '@/lib/supabase/server'
import EventosClient from './EventosClient'

export default async function EventosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('escuela_id').eq('id', user!.id).single()
  const escuelaId = perfil!.escuela_id

  const [{ data: eventos }, { data: alumnas }] = await Promise.all([
    supabase.from('eventos')
      .select('*, evento_alumna(id, estado, total, cuotas, lineas, alumnas(id, nombre, familias(nombre)))')
      .eq('escuela_id', escuelaId)
      .order('fecha', { ascending: false }),
    supabase.from('alumnas')
      .select('id, nombre, familias(nombre)')
      .eq('escuela_id', escuelaId)
      .eq('activa', true)
      .order('nombre'),
  ])

  return <EventosClient eventos={eventos ?? []} alumnas={alumnas ?? []} escuelaId={escuelaId} />
}
