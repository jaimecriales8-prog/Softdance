import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const BYDAY: Record<number, string> = { 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA', 7: 'SU' }

function nextWeekday(dayNum: number): Date {
  const today = new Date()
  const todayDay = today.getDay() === 0 ? 7 : today.getDay()
  const diff = ((dayNum - todayDay + 7) % 7) || 7
  const d = new Date(today)
  d.setDate(today.getDate() + diff)
  return d
}

function icsDate(date: Date, time: string): string {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
}

function uid() { return Math.random().toString(36).substring(2) + '@softdance' }

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profesor } = await supabase
    .from('profesores')
    .select('id, nombre, grupo_profesor(grupo_id), actividad_profesor(actividad_id)')
    .eq('user_id', user.id)
    .single()

  if (!profesor) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { data: perfil } = await supabase.from('perfiles').select('escuela_id').eq('id', user.id).single()
  const { data: escuela } = await supabase.from('escuelas').select('nombre').eq('id', perfil!.escuela_id).single()

  const grupoIds = (profesor.grupo_profesor as any[]).map((gp: any) => gp.grupo_id)
  const actividadIds = (profesor.actividad_profesor as any[]).map((ap: any) => ap.actividad_id)

  if (grupoIds.length === 0 && actividadIds.length === 0) {
    return new NextResponse('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR', {
      headers: { 'Content-Type': 'text/calendar', 'Content-Disposition': 'attachment; filename="mis-clases.ics"' }
    })
  }

  let query = supabase.from('horarios')
    .select('id, dia_semana, hora_inicio, hora_fin, salon, grupos(nombre), actividades_extra(nombre)')
    .order('dia_semana').order('hora_inicio')

  if (grupoIds.length > 0 && actividadIds.length > 0) {
    const gIn = grupoIds.map((id: string) => `"${id}"`).join(',')
    const aIn = actividadIds.map((id: string) => `"${id}"`).join(',')
    query = query.or(`grupo_id.in.(${gIn}),actividad_id.in.(${aIn})`)
  } else if (grupoIds.length > 0) {
    query = query.in('grupo_id', grupoIds)
  } else {
    query = query.in('actividad_id', actividadIds)
  }

  const { data: horarios } = await query
  const events: string[] = []

  for (const h of horarios ?? []) {
    const g = Array.isArray(h.grupos) ? h.grupos[0] : h.grupos
    const a = Array.isArray(h.actividades_extra) ? h.actividades_extra[0] : h.actividades_extra
    const nombre = g?.nombre ?? a?.nombre ?? 'Clase'
    const dia = h.dia_semana as number
    const byDay = BYDAY[dia]
    if (!byDay) continue

    const firstDate = nextWeekday(dia)
    events.push([
      'BEGIN:VEVENT',
      `UID:${uid()}`,
      `DTSTART;TZID=America/Bogota:${icsDate(firstDate, h.hora_inicio)}`,
      `DTEND;TZID=America/Bogota:${icsDate(firstDate, h.hora_fin)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`,
      `SUMMARY:${nombre} — ${escuela?.nombre ?? 'Softdance'}`,
      h.salon ? `LOCATION:${h.salon}` : '',
      'END:VEVENT',
    ].filter(Boolean).join('\r\n'))
  }

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//Softdance//${escuela?.nombre ?? 'Dance School'}//ES`,
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:Mis clases — ${escuela?.nombre ?? 'Softdance'}`,
    'X-WR-TIMEZONE:America/Bogota',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="mis-clases.ics"`,
    }
  })
}
