import { createClient } from '@/lib/supabase/server'
import TarifasClient from './TarifasClient'

export default async function TarifasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('escuela_id').eq('id', user!.id).single()
  const escuelaId = perfil!.escuela_id

  const [{ data: escuela }, { data: grupos }, { data: actividades }] = await Promise.all([
    supabase.from('escuelas').select('id, valor_matricula').eq('id', escuelaId).single(),
    supabase.from('grupos').select('id, nombre, es_elite, precio_mensual, activo').eq('escuela_id', escuelaId).order('es_elite').order('nombre'),
    supabase.from('actividades_extra').select('id, nombre, precio, es_recurrente, activa').eq('escuela_id', escuelaId).order('nombre'),
  ])

  return (
    <TarifasClient
      escuela={escuela ?? { id: escuelaId, valor_matricula: 0 }}
      grupos={grupos ?? []}
      actividades={actividades ?? []}
    />
  )
}
