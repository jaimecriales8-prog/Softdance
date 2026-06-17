import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { email, password, codigos } = await request.json()

  if (!email || !password || !Array.isArray(codigos) || codigos.length === 0) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  if (codigos.length > 3) {
    return NextResponse.json({ error: 'Máximo 3 alumnas por familia' }, { status: 400 })
  }

  const codigosLimpios: string[] = codigos
    .map((c: unknown) => typeof c === 'string' ? c.trim().toUpperCase() : '')
    .filter(Boolean)

  const service = createServiceClient()

  // Re-verificar códigos (evita condición de carrera con la previsualización)
  const { data: alumnas, error: errAlumnas } = await service
    .from('alumnas')
    .select('id, nombre, codigo_vinculacion, familia_id, escuela_id')
    .in('codigo_vinculacion', codigosLimpios)

  if (errAlumnas) return NextResponse.json({ error: 'Error al verificar códigos' }, { status: 500 })

  const encontradas = alumnas ?? []

  if (encontradas.length !== codigosLimpios.length) {
    return NextResponse.json({ error: 'Uno o más códigos no son válidos' }, { status: 404 })
  }

  const yaVinculadas = encontradas.filter(a => a.familia_id !== null)
  if (yaVinculadas.length > 0) {
    return NextResponse.json(
      { error: `${yaVinculadas.map(a => a.nombre).join(', ')} ya ${yaVinculadas.length === 1 ? 'está vinculada' : 'están vinculadas'} a otra cuenta` },
      { status: 409 }
    )
  }

  // Todas deben ser de la misma escuela
  const escuelas = [...new Set(encontradas.map(a => a.escuela_id))]
  if (escuelas.length > 1) {
    return NextResponse.json({ error: 'Los códigos pertenecen a escuelas distintas' }, { status: 400 })
  }
  const escuelaId = escuelas[0]

  // Verificar que el email no esté registrado ya
  const { data: emailExistente } = await service
    .from('perfiles')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  if (emailExistente) {
    return NextResponse.json({ error: 'Ya existe una cuenta con ese correo. Inicia sesión.' }, { status: 409 })
  }

  // 1. Crear usuario en Auth
  const { data: authData, error: errAuth } = await service.auth.admin.createUser({
    email: email.toLowerCase().trim(),
    password,
    email_confirm: true,
  })

  if (errAuth || !authData.user) {
    return NextResponse.json({ error: errAuth?.message ?? 'Error al crear usuario' }, { status: 500 })
  }

  const userId = authData.user.id

  try {
    // 2. Crear familia
    const nombreFamilia = `Familia ${encontradas[0].nombre.split(' ')[0]}`
    const { data: familia, error: errFamilia } = await service
      .from('familias')
      .insert({ escuela_id: escuelaId, nombre: nombreFamilia, email: email.toLowerCase().trim(), activa: true })
      .select()
      .single()

    if (errFamilia || !familia) throw new Error(errFamilia?.message ?? 'Error al crear familia')

    // 3. Crear perfil
    await service.from('perfiles').insert({
      id: userId,
      email: email.toLowerCase().trim(),
      rol: 'padre',
      escuela_id: escuelaId,
      familia_id: familia.id,
    })

    // 4. Vincular alumnas a la familia
    await service
      .from('alumnas')
      .update({ familia_id: familia.id })
      .in('codigo_vinculacion', codigosLimpios)

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    // Rollback: eliminar usuario de auth si algo falló
    await service.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: err.message ?? 'Error al registrar' }, { status: 500 })
  }
}
