import { createClient } from '@/lib/supabase/server'
import FamiliasClient from './FamiliasClient'

export default async function FamiliasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('escuela_id').eq('id', user!.id).single()
  const escuelaId = perfil!.escuela_id

  const { data: familias } = await supabase
    .from('familias')
    .select(`
      id, nombre, email, telefono, activa, created_at,
      alumnas(id, nombre, activa)
    `)
    .eq('escuela_id', escuelaId)
    .order('nombre')

  return <FamiliasClient familias={familias ?? []} escuelaId={escuelaId} />
}
