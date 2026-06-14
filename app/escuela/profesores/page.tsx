import { createClient } from '@/lib/supabase/server'
import ProfesoresClient from './ProfesoresClient'

export default async function ProfesoresPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('escuela_id').eq('id', user!.id).single()
  const escuelaId = perfil!.escuela_id

  const [{ data: profesores }, { data: grupos }, { data: actividades }] = await Promise.all([
    supabase.from('profesores')
      .select('*, grupo_profesor(grupo_id, grupos(id, nombre, es_elite)), actividad_profesor(actividad_id, actividades_extra(id, nombre))')
      .eq('escuela_id', escuelaId)
      .order('nombre'),
    supabase.from('grupos').select('id, nombre, es_elite').eq('escuela_id', escuelaId).order('nombre'),
    supabase.from('actividades_extra').select('id, nombre').eq('escuela_id', escuelaId).eq('activa', true).order('nombre'),
  ])

  return (
    <ProfesoresClient
      profesores={(profesores ?? []) as any[]}
      grupos={grupos ?? []}
      actividades={actividades ?? []}
    />
  )
}
