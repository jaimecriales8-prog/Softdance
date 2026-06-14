import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol === 'super_admin') redirect('/super-admin')
  if (perfil?.rol === 'admin_escuela') redirect('/escuela')
  if (perfil?.rol === 'padre') redirect('/familia')
  if (perfil?.rol === 'profesor') redirect('/profesor')

  redirect('/login')
}
