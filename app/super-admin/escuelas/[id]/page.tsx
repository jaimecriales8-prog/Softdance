import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import EscuelaDetalleClient from './EscuelaDetalleClient'

export default async function EscuelaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const service = createServiceClient()

  const { data: escuela } = await supabase
    .from('escuelas')
    .select('*')
    .eq('id', id)
    .single()

  if (!escuela) notFound()

  const { data: admins } = await service
    .from('perfiles')
    .select('id, nombre, email, created_at')
    .eq('escuela_id', id)
    .eq('rol', 'admin_escuela')

  return <EscuelaDetalleClient escuela={escuela} admins={admins ?? []} />
}
