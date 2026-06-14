import { createClient } from '@/lib/supabase/server'
import MensualidadesClient from './MensualidadesClient'

export default async function MensualidadesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('escuela_id').eq('id', user!.id).single()
  const escuelaId = perfil!.escuela_id

  const ahora = new Date()
  const periodo = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`

  const [{ data: escuela }, { data: mensualidades }] = await Promise.all([
    supabase.from('escuelas').select('id, meses_activos').eq('id', escuelaId).single(),
    supabase.from('mensualidades')
      .select('*, familias(nombre, email, telefono)')
      .eq('escuela_id', escuelaId)
      .order('periodo', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  return (
    <MensualidadesClient
      escuela={escuela ?? { id: escuelaId, meses_activos: [1,2,3,4,5,6,7,8,9,10,11,12] }}
      mensualidades={mensualidades ?? []}
      periodoActual={periodo}
    />
  )
}
