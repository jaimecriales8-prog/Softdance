import { createClient } from '@/lib/supabase/server'
import HorariosClient from './HorariosClient'

export default async function HorariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('escuela_id').eq('id', user!.id).single()
  const escuelaId = perfil!.escuela_id

  const [{ data: horarios }, { data: grupos }] = await Promise.all([
    supabase.from('horarios')
      .select('*, grupos(id, nombre, es_elite)')
      .eq('escuela_id', escuelaId)
      .order('dia_semana').order('hora_inicio'),
    supabase.from('grupos')
      .select('id, nombre, es_elite')
      .eq('escuela_id', escuelaId)
      .eq('activo', true)
      .order('es_elite').order('nombre'),
  ])

  return <HorariosClient horarios={horarios ?? []} grupos={grupos ?? []} escuelaId={escuelaId} />
}
