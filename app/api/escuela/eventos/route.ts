import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function getEscuelaId(supabase: any, userId: string) {
  const { data } = await supabase.from('perfiles').select('escuela_id, rol').eq('id', userId).single()
  if (data?.rol !== 'admin_escuela') return null
  return data.escuela_id
}

const SELECT = '*, evento_alumna(id, estado, total, cuotas, lineas, alumnas(id, nombre, familias(nombre)))'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { data } = await supabase.from('eventos').select(SELECT)
    .eq('escuela_id', escuelaId).order('fecha', { ascending: false })

  return NextResponse.json({ eventos: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { nombre, descripcion, fecha, num_cuotas, conceptos } = await request.json()
  if (!nombre) return NextResponse.json({ error: 'Falta nombre' }, { status: 400 })
  if (!Array.isArray(conceptos) && conceptos !== undefined) return NextResponse.json({ error: 'conceptos inválidos' }, { status: 400 })
  if (Array.isArray(conceptos) && conceptos.length > 50) return NextResponse.json({ error: 'Máximo 50 conceptos' }, { status: 400 })
  const conceptosValidos = (conceptos ?? []).filter((c: any) => c && typeof c.nombre === 'string' && typeof c.valor === 'number' && c.valor >= 0)

  const { data, error } = await supabase.from('eventos')
    .insert({ escuela_id: escuelaId, nombre, descripcion: descripcion || null, precio: 0, fecha: fecha || null, num_cuotas: num_cuotas || 1, conceptos: conceptosValidos })
    .select(SELECT).single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ evento: data })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id, nombre, descripcion, fecha, num_cuotas, conceptos } = await request.json()
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  if (!Array.isArray(conceptos) && conceptos !== undefined) return NextResponse.json({ error: 'conceptos inválidos' }, { status: 400 })
  if (Array.isArray(conceptos) && conceptos.length > 50) return NextResponse.json({ error: 'Máximo 50 conceptos' }, { status: 400 })
  const conceptosValidos = (conceptos ?? []).filter((c: any) => c && typeof c.nombre === 'string' && typeof c.valor === 'number' && c.valor >= 0)

  const { data, error } = await supabase.from('eventos')
    .update({ nombre, descripcion: descripcion || null, fecha: fecha || null, num_cuotas: num_cuotas || 1, conceptos: conceptosValidos })
    .eq('id', id).eq('escuela_id', escuelaId)
    .select(SELECT).single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ evento: data })
}
