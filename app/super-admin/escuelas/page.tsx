import { createClient } from '@/lib/supabase/server'
import EscuelasClient from './EscuelasClient'

export default async function EscuelasPage() {
  const supabase = await createClient()
  const { data: escuelas } = await supabase
    .from('escuelas')
    .select('*')
    .order('created_at', { ascending: false })

  return <EscuelasClient escuelas={escuelas ?? []} />
}
