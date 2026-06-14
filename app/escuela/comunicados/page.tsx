import { createClient } from '@/lib/supabase/server'
import ComunicadosClient from './ComunicadosClient'

export default async function ComunicadosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('escuela_id').eq('id', user!.id).single()

  const [{ data: comunicados }, { data: grupos }] = await Promise.all([
    supabase.from('comunicados')
      .select('*, grupos(nombre)')
      .eq('escuela_id', perfil!.escuela_id)
      .order('created_at', { ascending: false }),
    supabase.from('grupos')
      .select('id, nombre')
      .eq('escuela_id', perfil!.escuela_id)
      .order('nombre'),
  ])

  return <ComunicadosClient comunicadosIniciales={comunicados ?? []} grupos={grupos ?? []} />
}
