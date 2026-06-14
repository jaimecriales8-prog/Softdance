import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function getEscuelaId(supabase: any, userId: string) {
  const { data } = await supabase.from('perfiles').select('escuela_id, rol').eq('id', userId).single()
  if (data?.rol !== 'admin_escuela') return null
  return data.escuela_id
}

const SELECT = 'id, estado, total, cuotas, lineas, alumnas(id, nombre, familias(nombre))'

// POST { evento_id, alumna_id, lineas } → agregar participante con sus líneas y cuotas
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { evento_id, alumna_id, lineas } = await request.json()

  const { data: evento } = await supabase.from('eventos').select('num_cuotas').eq('id', evento_id).single()
  const numCuotas = evento?.num_cuotas ?? 1
  const total = (lineas ?? []).reduce((s: number, l: any) => s + (l.valor || 0), 0)
  const cuotas = Array.from({ length: numCuotas }, (_, i) => ({ numero: i + 1, estado: 'pendiente' }))

  const { data, error } = await supabase.from('evento_alumna')
    .upsert(
      { escuela_id: escuelaId, evento_id, alumna_id, estado: 'pendiente', lineas: lineas ?? [], total, cuotas },
      { onConflict: 'evento_id,alumna_id' }
    )
    .select(SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ participante: data })
}

// DELETE { evento_id, alumna_id }
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { evento_id, alumna_id } = await request.json()
  await supabase.from('evento_alumna')
    .delete()
    .eq('evento_id', evento_id).eq('alumna_id', alumna_id).eq('escuela_id', escuelaId)

  return NextResponse.json({ ok: true })
}

// PATCH { evento_id, alumna_id, cuota_numero, cuota_estado } → marcar cuota
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { evento_id, alumna_id, cuota_numero, cuota_estado } = await request.json()

  const { data: actual } = await supabase.from('evento_alumna')
    .select('cuotas')
    .eq('evento_id', evento_id).eq('alumna_id', alumna_id).eq('escuela_id', escuelaId)
    .single()

  const cuotas = ((actual?.cuotas ?? []) as { numero: number; estado: string }[])
    .map(c => c.numero === cuota_numero ? { ...c, estado: cuota_estado } : c)
  const todasPagadas = cuotas.every(c => c.estado === 'pagado')

  const { data, error } = await supabase.from('evento_alumna')
    .update({ cuotas, estado: todasPagadas ? 'pagado' : 'pendiente' })
    .eq('evento_id', evento_id).eq('alumna_id', alumna_id).eq('escuela_id', escuelaId)
    .select(SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ participante: data })
}
