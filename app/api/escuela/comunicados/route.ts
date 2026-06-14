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
  const { data } = await supabase.from('comunicados')
    .select('*, grupos(nombre)').eq('escuela_id', escuelaId).order('created_at', { ascending: false })
  return NextResponse.json({ comunicados: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { titulo, cuerpo, grupo_id } = await request.json()
  if (!titulo || !cuerpo) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
  const { data, error } = await supabase.from('comunicados')
    .insert({ escuela_id: escuelaId, titulo, cuerpo, grupo_id: grupo_id || null })
    .select('*, grupos(nombre)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ comunicado: data })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { id } = await request.json()
  await supabase.from('comunicados').delete().eq('id', id).eq('escuela_id', escuelaId)
  return NextResponse.json({ ok: true })
}
