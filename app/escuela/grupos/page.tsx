import { createClient } from '@/lib/supabase/server'
import GruposClient from './GruposClient'

export default async function GruposPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('escuela_id').eq('id', user!.id).single()

  const [{ data: grupos }, { data: grupoProfesores }] = await Promise.all([
    supabase.from('grupos').select('*').eq('escuela_id', perfil!.escuela_id).order('es_elite').order('edad_min'),
    supabase.from('grupo_profesor').select('grupo_id, profesores(id, nombre)').eq('escuela_id', perfil!.escuela_id),
  ])

  // Map grupo_id → profesor nombres
  const profesoresPorGrupo: Record<string, string[]> = {}
  for (const gp of grupoProfesores ?? []) {
    const prof = Array.isArray(gp.profesores) ? gp.profesores[0] : gp.profesores
    if (!prof) continue
    if (!profesoresPorGrupo[gp.grupo_id]) profesoresPorGrupo[gp.grupo_id] = []
    profesoresPorGrupo[gp.grupo_id].push(prof.nombre)
  }

  const gruposConProf = (grupos ?? []).map(g => ({
    ...g,
    profesores: profesoresPorGrupo[g.id] ?? [],
  }))

  return <GruposClient grupos={gruposConProf} escuelaId={perfil!.escuela_id} />
}
