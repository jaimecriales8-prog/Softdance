import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const BYDAY: Record<number, string> = { 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA', 7: 'SU' }

function nextWeekday(dayNum: number): Date {
  const today = new Date()
  const todayDay = today.getDay() === 0 ? 7 : today.getDay() // 1=Mon…7=Sun
  const diff = ((dayNum - todayDay + 7) % 7) || 7
  const d = new Date(today)
  d.setDate(today.getDate() + diff)
  return d
}

function icsDate(date: Date, time: string): string {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  // Format as local time with TZID
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
}

function uid(): string {
  return Math.random().toString(36).substring(2) + '@softdance'
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('perfiles').select('familia_id, escuela_id').eq('id', user.id).single()
  if (!perfil?.familia_id) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { data: escuela } = await supabase.from('escuelas').select('nombre').eq('id', perfil.escuela_id).single()

  const { data: alumnas } = await supabase
    .from('alumnas')
    .select('id, nombre, alumna_grupo(activo, grupos(id, nombre))')
    .eq('familia_id', perfil.familia_id)
    .eq('activa', true)

  const grupoIds = new Set<string>()
  const grupoAlumnas: Record<string, string[]> = {}

  for (const a of alumnas ?? []) {
    for (const ag of (a.alumna_grupo ?? []) as any[]) {
      if (!ag.activo) continue
      const g = Array.isArray(ag.grupos) ? ag.grupos[0] : ag.grupos
      if (!g) continue
      grupoIds.add(g.id)
      if (!grupoAlumnas[g.id]) grupoAlumnas[g.id] = []
      grupoAlumnas[g.id].push(a.nombre)
    }
  }

  if (grupoIds.size === 0) {
    return new NextResponse('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR', {
      headers: { 'Content-Type': 'text/calendar', 'Content-Disposition': 'attachment; filename="horarios.ics"' }
    })
  }

  const { data: horarios } = await supabase
    .from('horarios')
    .select('id, dia_semana, hora_inicio, hora_fin, salon, profesora, grupos(id, nombre)')
    .in('grupo_id', [...grupoIds])
    .order('dia_semana').order('hora_inicio')

  const events: string[] = []

  for (const h of horarios ?? []) {
    const g = Array.isArray(h.grupos) ? h.grupos[0] : h.grupos
    if (!g) continue
    const dia = h.dia_semana as number
    const byDay = BYDAY[dia]
    if (!byDay) continue

    const firstDate = nextWeekday(dia)
    const dtstart = icsDate(firstDate, h.hora_inicio)
    const dtend = icsDate(firstDate, h.hora_fin)
    const alumnaNames = (grupoAlumnas[g.id] ?? []).join(', ')
    const desc = [alumnaNames, h.salon ? `Salón: ${h.salon}` : '', h.profesora ? `Profesora: ${h.profesora}` : ''].filter(Boolean).join('\\n')

    events.push([
      'BEGIN:VEVENT',
      `UID:${uid()}`,
      `DTSTART;TZID=America/Bogota:${dtstart}`,
      `DTEND;TZID=America/Bogota:${dtend}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`,
      `SUMMARY:${g.nombre} — ${escuela?.nombre ?? 'Softdance'}`,
      desc ? `DESCRIPTION:${desc}` : '',
      h.salon ? `LOCATION:${h.salon}` : '',
      'END:VEVENT',
    ].filter(Boolean).join('\r\n'))
  }

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//Softdance//${escuela?.nombre ?? 'Dance School'}//ES`,
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:Horarios ' + (escuela?.nombre ?? 'Softdance'),
    'X-WR-TIMEZONE:America/Bogota',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="horarios-${escuela?.nombre ?? 'softdance'}.ics"`,
    }
  })
}
