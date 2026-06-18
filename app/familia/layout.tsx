import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReactNode } from 'react'
import FamiliaLayoutClient from './FamiliaLayoutClient'

export default async function FamiliaLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol, familia_id')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'padre') redirect('/login')

  const { data: familia } = await supabase
    .from('familias')
    .select('nombre')
    .eq('id', perfil.familia_id)
    .single()

  return (
    <FamiliaLayoutClient nombreFamilia={familia?.nombre ?? ''}>
      {children}
    </FamiliaLayoutClient>
  )
}
