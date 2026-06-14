import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

async function getEscuelaId(supabase: any, userId: string) {
  const { data } = await supabase.from('perfiles').select('escuela_id, rol').eq('id', userId).single()
  if (data?.rol !== 'admin_escuela') return null
  return data.escuela_id
}

// GET → lista eventos con conteo de participantes
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { data } = await supabase
    .from('eventos')
    .select('*, evento_alumna(id, estado, cuotas, alumnas(id, nombre, familias(nombre)))')
    .eq('escuela_id', escuelaId)
    .order('fecha', { ascending: false })

  return NextResponse.json({ eventos: data ?? [] })
}

// POST → crear evento
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { nombre, descripcion, precio, fecha, num_cuotas } = await request.json()
  if (!nombre) return NextResponse.json({ error: 'Falta nombre' }, { status: 400 })

  const { data, error } = await supabase.from('eventos')
    .insert({ escuela_id: escuelaId, nombre, descripcion: descripcion || null, precio: precio || 0, fecha: fecha || null, num_cuotas: num_cuotas || 1 })
    .select('*, evento_alumna(id, estado, cuotas, alumnas(id, nombre, familias(nombre)))')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ evento: data })
}

// PATCH → editar evento
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id, nombre, descripcion, precio, fecha, activo, num_cuotas } = await request.json()
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const { data, error } = await supabase.from('eventos')
    .update({ nombre, descripcion: descripcion || null, precio, fecha: fecha || null, activo, num_cuotas: num_cuotas || 1 })
    .eq('id', id).eq('escuela_id', escuelaId)
    .select('*, evento_alumna(id, estado, cuotas, alumnas(id, nombre, familias(nombre)))')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ evento: data })
}
