import { createClient } from '@/lib/supabase/server'
import MatriculasClient from './MatriculasClient'

export default async function MatriculasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('escuela_id').eq('id', user!.id).single()
  const escuelaId = perfil!.escuela_id
  const anioActual = new Date().getFullYear()

  const [{ data: matriculas }, { data: familias }, { data: escuela }] = await Promise.all([
    supabase.from('matriculas')
      .select('*, familias(nombre, email)')
      .eq('escuela_id', escuelaId)
      .order('created_at', { ascending: false }),
    supabase.from('familias')
      .select('id, nombre, email')
      .eq('escuela_id', escuelaId)
      .eq('activa', true)
      .order('nombre'),
    supabase.from('escuelas')
      .select('valor_matricula')
      .eq('id', escuelaId)
      .single(),
  ])

  return (
    <MatriculasClient
      matriculasIniciales={matriculas ?? []}
      familias={familias ?? []}
      valorDefault={escuela?.valor_matricula ?? 0}
      anioActual={anioActual}
    />
  )
}
