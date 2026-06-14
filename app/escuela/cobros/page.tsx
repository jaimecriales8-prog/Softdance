import { createClient } from '@/lib/supabase/server'
import CobrosClient from './CobrosClient'

export default async function CobrosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('escuela_id').eq('id', user!.id).single()
  const escuelaId = perfil!.escuela_id

  const now = new Date()
  const periodoActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const [{ data: escuela }, { data: mensualidades }, { data: eventos }] = await Promise.all([
    supabase.from('escuelas').select('id, meses_activos').eq('id', escuelaId).single(),
    supabase.from('mensualidades')
      .select('id, familia_id, periodo, subtotal, descuento, total, estado, fecha_limite, detalle, familias(nombre, email, telefono)')
      .eq('escuela_id', escuelaId)
      .order('periodo', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('eventos')
      .select('*, evento_alumna(id, estado, cuotas, alumnas(id, nombre, familias(nombre)))')
      .eq('escuela_id', escuelaId)
      .order('fecha', { ascending: false }),
  ])

  return (
    <CobrosClient
      escuela={escuela ?? { id: escuelaId, meses_activos: [] }}
      mensualidades={mensualidades ?? []}
      eventos={eventos ?? []}
      periodoActual={periodoActual}
    />
  )
}
