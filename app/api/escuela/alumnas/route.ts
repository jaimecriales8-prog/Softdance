import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function getEscuelaId(supabase: any, userId: string) {
  const { data } = await supabase.from('perfiles').select('escuela_id, rol').eq('id', userId).single()
  if (data?.rol !== 'admin_escuela') return null
  return data.escuela_id
}

function generarCodigo(): string {
  const chars = 'BCDFGHJKLMNPQRSTVWXYZ23456789'
  let code = 'SD-'
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

async function codigoUnico(supabase: any, escuelaId: string): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const codigo = generarCodigo()
    const { data } = await supabase.from('alumnas').select('id').eq('codigo_vinculacion', codigo).maybeSingle()
    if (!data) return codigo
  }
  throw new Error('No se pudo generar código único')
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { nombre, documento, fecha_nacimiento, notas, grupo_id, familia_id, descuento_mensual } = await request.json()
  if (!nombre || !familia_id) return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })

  const codigo_vinculacion = await codigoUnico(supabase, escuelaId)

  const { data: alumna, error } = await supabase.from('alumnas').insert({
    escuela_id: escuelaId,
    familia_id,
    nombre,
    documento: documento || null,
    fecha_nacimiento: fecha_nacimiento || null,
    notas: notas || null,
    activa: true,
    codigo_vinculacion,
    descuento_mensual: descuento_mensual ? Number(descuento_mensual) : null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Asignar grupo inicial si se especificó
  if (grupo_id) {
    await supabase.from('alumna_grupo').insert({
      escuela_id: escuelaId,
      alumna_id: alumna.id,
      grupo_id,
      fecha_inicio: new Date().toISOString().split('T')[0],
      activo: true,
    })
  }

  // Cargar alumna con grupos
  const { data: alumnaCompleta } = await supabase
    .from('alumnas')
    .select(`id, nombre, fecha_nacimiento, foto_url, activa, notas, codigo_vinculacion,
      alumna_grupo(id, fecha_inicio, fecha_fin, activo, grupos(id, nombre, es_elite))`)
    .eq('id', alumna.id)
    .single()

  return NextResponse.json({ alumna: alumnaCompleta })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id, nombre, documento, fecha_nacimiento, notas, activa, descuento_mensual } = await request.json()
  if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 })

  const updates: Record<string, any> = {}
  if (nombre !== undefined) updates.nombre = nombre
  if (documento !== undefined) updates.documento = documento || null
  if (fecha_nacimiento !== undefined) updates.fecha_nacimiento = fecha_nacimiento || null
  if (notas !== undefined) updates.notas = notas || null
  if (activa !== undefined) updates.activa = activa
  if (descuento_mensual !== undefined) updates.descuento_mensual = descuento_mensual === null ? null : Number(descuento_mensual)

  const { data: alumna, error } = await supabase
    .from('alumnas')
    .update(updates)
    .eq('id', id)
    .eq('escuela_id', escuelaId)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ alumna })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const escuelaId = await getEscuelaId(supabase, user.id)
  if (!escuelaId) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 })

  // Verificar que pertenece a esta escuela
  const { data: alumna } = await supabase
    .from('alumnas')
    .select('id')
    .eq('id', id)
    .eq('escuela_id', escuelaId)
    .single()

  if (!alumna) return NextResponse.json({ error: 'Alumna no encontrada' }, { status: 404 })

  // Borrar registros dependientes primero
  await supabase.from('alumna_grupo').delete().eq('alumna_id', id)
  await supabase.from('alumna_actividad').delete().eq('alumna_id', id)
  await supabase.from('evento_alumna').delete().eq('alumna_id', id)

  const { error } = await supabase.from('alumnas').delete().eq('id', id).eq('escuela_id', escuelaId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
