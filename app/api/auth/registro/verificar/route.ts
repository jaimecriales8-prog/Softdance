import { createServiceClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { codigos } = await request.json()

  if (!Array.isArray(codigos) || codigos.length === 0 || codigos.length > 3) {
    return NextResponse.json({ error: 'Entre 1 y 3 códigos requeridos' }, { status: 400 })
  }

  const codigosLimpios: string[] = codigos
    .map((c: unknown) => typeof c === 'string' ? c.trim().toUpperCase() : '')
    .filter(Boolean)

  if (codigosLimpios.length === 0) {
    return NextResponse.json({ error: 'Códigos inválidos' }, { status: 400 })
  }

  const service = createServiceClient()

  const { data: alumnas, error } = await service
    .from('alumnas')
    .select('id, nombre, codigo_vinculacion, familia_id, escuela_id, escuelas(nombre)')
    .in('codigo_vinculacion', codigosLimpios)

  if (error) return NextResponse.json({ error: 'Error al verificar' }, { status: 500 })

  // Verificar que todos los códigos existan
  const encontrados = alumnas ?? []
  const codigosEncontrados = encontrados.map(a => a.codigo_vinculacion)
  const noEncontrados = codigosLimpios.filter(c => !codigosEncontrados.includes(c))

  if (noEncontrados.length > 0) {
    return NextResponse.json(
      { error: `Código(s) no válido(s): ${noEncontrados.join(', ')}` },
      { status: 404 }
    )
  }

  // Verificar que no tengan familia asignada ya
  const yaVinculadas = encontrados.filter(a => a.familia_id !== null)
  if (yaVinculadas.length > 0) {
    return NextResponse.json(
      { error: `${yaVinculadas.map(a => a.nombre).join(', ')} ya ${yaVinculadas.length === 1 ? 'está vinculada' : 'están vinculadas'} a otra cuenta. Contacta a la escuela.` },
      { status: 409 }
    )
  }

  // Verificar que todos los códigos sean de la misma escuela
  const escuelas = [...new Set(encontrados.map(a => a.escuela_id))]
  if (escuelas.length > 1) {
    return NextResponse.json(
      { error: 'Los códigos pertenecen a escuelas distintas. Verifica que sean correctos.' },
      { status: 400 }
    )
  }

  const nombreEscuela = (encontrados[0] as any).escuelas?.nombre ?? ''

  return NextResponse.json({
    escuela: nombreEscuela,
    alumnas: encontrados.map(a => ({ nombre: a.nombre, codigo: a.codigo_vinculacion }))
  })
}
