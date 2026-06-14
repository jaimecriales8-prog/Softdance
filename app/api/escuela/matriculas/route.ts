import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function getEscuelaId(supabase: any, userId: string) {
  const { data } = await supabase.from('perfiles').select('escuela_id, rol').eq('id', userId).single()
  if (data?.rol !== 'admin_escuela') return null
  return data.escuela_id
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { data } = await supabase.from('matriculas')
    .select('*, familias(nombre, email)')
    .eq('escuela_id', escuelaId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ matriculas: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { familia_id, anio, valor } = await request.json()
  if (!familia_id || !anio || valor === undefined)
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })

  const { data, error } = await supabase.from('matriculas')
    .upsert({ escuela_id: escuelaId, familia_id, anio, valor, estado: 'pendiente' }, { onConflict: 'escuela_id,familia_id,anio' })
    .select('*, familias(nombre, email)').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ matricula: data })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id, estado } = await request.json()
  const { data, error } = await supabase.from('matriculas')
    .update({ estado })
    .eq('id', id)
    .eq('escuela_id', escuelaId)
    .select('*, familias(nombre, email)').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ matricula: data })
}
