import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

async function checkSuperAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from('perfiles').select('rol').eq('id', userId).single()
  return data?.rol === 'super_admin'
}

// PATCH { escuela_id, cobro_activo?, activa? }
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await checkSuperAdmin(supabase, user.id)))
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { escuela_id, ...fields } = await request.json()
  const allowed = ['cobro_activo', 'activa', 'plan']
  const update = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)))

  const service = createServiceClient()
  const { data, error } = await service.from('escuelas').update(update).eq('id', escuela_id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ escuela: data })
}
