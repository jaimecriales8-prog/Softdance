import { createClient } from '@/lib/supabase/server'
import GruposClient from './GruposClient'

export default async function GruposPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('escuela_id').eq('id', user!.id).single()

  const { data: grupos } = await supabase
    .from('grupos')
    .select('*')
    .eq('escuela_id', perfil!.escuela_id)
    .order('es_elite').order('edad_min')

  return <GruposClient grupos={grupos ?? []} escuelaId={perfil!.escuela_id} />
}
