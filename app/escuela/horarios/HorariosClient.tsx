'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

type Grupo = { id: string; nombre: string; es_elite: boolean }
type Actividad = { id: string; nombre: string }
type Horario = {
  id: string; grupo_id: string | null; actividad_id: string | null; dia_semana: number
  hora_inicio: string; hora_fin: string; salon: string | null; profesora: string | null
  grupos: Grupo | Grupo[] | null
  actividades_extra: Actividad | Actividad[] | null
}

const EMPTY = { tipo: 'grupo', grupo_id: '', actividad_id: '', dia_semana: '1', hora_inicio: '08:00', hora_fin: '09:00', salon: '', profesora: '' }

function getGrupo(h: Horario): Grupo | null {
  if (!h.grupos) return null
  return Array.isArray(h.grupos) ? h.grupos[0] : h.grupos
}

function getActividad(h: Horario): Actividad | null {
  if (!h.actividades_extra) return null
  return Array.isArray(h.actividades_extra) ? h.actividades_extra[0] : h.actividades_extra
}

function getNombre(h: Horario): string {
  const g = getGrupo(h)
  if (g) return g.nombre
  const a = getActividad(h)
  if (a) return a.nombre
  return '—'
}

export default function HorariosClient({ horarios: inicial, grupos, actividades, escuelaId }: {
  horarios: Horario[]; grupos: Grupo[]; actividades: Actividad[]; escuelaId: string
}) {
  const [horarios, setHorarios] = useState(inicial)
  const [modal, setModal] = useState<'crear' | 'editar' | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [vista, setVista] = useState<'lista' | 'disponibilidad'>('lista')

  const supabase = createClient()

  function abrirCrear() { setForm(EMPTY); setEditId(null); setModal('crear') }
  function abrirEditar(h: Horario) {
    setForm({
      tipo: h.actividad_id ? 'actividad' : 'grupo',
      grupo_id: h.grupo_id ?? '',
      actividad_id: h.actividad_id ?? '',
      dia_semana: h.dia_semana.toString(),
      hora_inicio: h.hora_inicio,
      hora_fin: h.hora_fin,
      salon: h.salon ?? '',
      profesora: h.profesora ?? '',
    })
    setEditId(h.id); setModal('editar')
  }
  function cerrar() { setModal(null); setEditId(null) }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload = {
      escuela_id: escuelaId,
      grupo_id: form.tipo === 'grupo' ? form.grupo_id : null,
      actividad_id: form.tipo === 'actividad' ? form.actividad_id : null,
      dia_semana: parseInt(form.dia_semana),
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
      salon: form.salon || null,
      profesora: form.profesora || null,
    }

    const select = '*, grupos(id, nombre, es_elite), actividades_extra(id, nombre)'

    if (modal === 'crear') {
      const { data, error } = await supabase.from('horarios').insert(payload).select(select).single()
      if (!error && data) setHorarios([...horarios, data].sort((a, b) => a.dia_semana - b.dia_semana || a.hora_inicio.localeCompare(b.hora_inicio)))
    } else if (editId) {
      const { data, error } = await supabase.from('horarios').update(payload).eq('id', editId).select(select).single()
      if (!error && data) setHorarios(horarios.map(h => h.id === editId ? data : h))
    }
    cerrar(); setLoading(false)
  }

  async function eliminar(id: string) {
    await supabase.from('horarios').delete().eq('id', id)
    setHorarios(horarios.filter(h => h.id !== id))
  }

  const porDia = DIAS.reduce((acc, _, i) => {
    if (i === 0) return acc
    acc[i] = horarios.filter(h => h.dia_semana === i)
    return acc
  }, {} as Record<number, Horario[]>)

  const normales = grupos.filter(g => !g.es_elite)
  const elite = grupos.filter(g => g.es_elite)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Horarios</h1>
          <p className="text-white/40 text-sm mt-0.5">{horarios.length} clases programadas</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
            {([['lista', 'Lista'], ['disponibilidad', 'Disponibilidad']] as const).map(([v, label]) => (
              <button key={v} onClick={() => setVista(v)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${vista === v ? 'bg-[#e91e8c] text-white' : 'text-white/50 hover:text-white'}`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={abrirCrear}
            className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Nueva clase
          </button>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-4">
              {modal === 'crear' ? 'Nueva clase' : 'Editar clase'}
            </h2>
            <form onSubmit={guardar} className="space-y-3">

              {/* Tipo */}
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm({ ...form, tipo: 'grupo', actividad_id: '' })}
                  className={`flex-1 text-sm py-1.5 rounded-lg border transition-colors ${form.tipo === 'grupo' ? 'bg-[#e91e8c] border-[#e91e8c] text-white' : 'border-white/10 text-white/50 hover:border-white/30'}`}>
                  Grupo
                </button>
                <button type="button" onClick={() => setForm({ ...form, tipo: 'actividad', grupo_id: '' })}
                  className={`flex-1 text-sm py-1.5 rounded-lg border transition-colors ${form.tipo === 'actividad' ? 'bg-[#e91e8c] border-[#e91e8c] text-white' : 'border-white/10 text-white/50 hover:border-white/30'}`}>
                  Actividad extra
                </button>
              </div>

              {form.tipo === 'grupo' ? (
                <div>
                  <label className="block text-xs text-white/50 mb-1">Grupo *</label>
                  <select required value={form.grupo_id} onChange={e => setForm({ ...form, grupo_id: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]">
                    <option value="">Seleccionar grupo</option>
                    {normales.length > 0 && <optgroup label="Grupos por edad">
                      {normales.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                    </optgroup>}
                    {elite.length > 0 && <optgroup label="Grupos élite">
                      {elite.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                    </optgroup>}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-white/50 mb-1">Actividad extra *</label>
                  <select required value={form.actividad_id} onChange={e => setForm({ ...form, actividad_id: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]">
                    <option value="">Seleccionar actividad</option>
                    {actividades.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs text-white/50 mb-1">Día *</label>
                <select required value={form.dia_semana} onChange={e => setForm({ ...form, dia_semana: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]">
                  {DIAS.slice(1).map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Hora inicio *</label>
                  <input type="time" required value={form.hora_inicio} onChange={e => setForm({ ...form, hora_inicio: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Hora fin *</label>
                  <input type="time" required value={form.hora_fin} onChange={e => setForm({ ...form, hora_fin: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Salón</label>
                  <select value={form.salon} onChange={e => setForm({ ...form, salon: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]">
                    <option value="">Sin asignar</option>
                    <option value="Beat">Beat</option>
                    <option value="Movich">Movich</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Profesora</label>
                  <input value={form.profesora} onChange={e => setForm({ ...form, profesora: e.target.value })}
                    placeholder="Nombre"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={cerrar}
                  className="flex-1 border border-white/10 text-white/60 text-sm py-2 rounded-lg hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm py-2 rounded-lg disabled:opacity-50 transition-colors">
                  {loading ? 'Guardando...' : modal === 'crear' ? 'Crear clase' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {vista === 'disponibilidad' ? (
        <Disponibilidad horarios={horarios} getNombre={getNombre} />
      ) : horarios.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-12 text-center text-white/30 text-sm">
          No hay clases programadas aún
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(porDia).filter(([, hs]) => hs.length > 0).map(([dia, hs]) => (
            <div key={dia}>
              <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">{DIAS[parseInt(dia)]}</h2>
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {hs.map((h, i) => {
                      const g = getGrupo(h)
                      const a = getActividad(h)
                      return (
                        <tr key={h.id} className={`${i < hs.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/5 transition-colors`}>
                          <td className="px-4 py-3 w-28">
                            <p className="text-white font-mono text-sm">{h.hora_inicio.slice(0, 5)} – {h.hora_fin.slice(0, 5)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-white font-medium">{getNombre(h)}</p>
                            {g?.es_elite && <span className="text-[#e91e8c] text-xs">élite</span>}
                            {a && <span className="text-white/40 text-xs">actividad extra</span>}
                          </td>
                          <td className="px-4 py-3 text-white/50 text-xs">{h.salon ?? '—'}</td>
                          <td className="px-4 py-3 text-white/50 text-xs">{h.profesora ?? '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => abrirEditar(h)}
                              className="text-xs text-white/40 hover:text-white px-2 py-1 rounded hover:bg-white/5 transition-colors mr-1">
                              Editar
                            </button>
                            <button onClick={() => eliminar(h.id)}
                              className="text-xs text-red-400/60 hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/10 transition-colors">
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const HORAS = Array.from({ length: 14 }, (_, i) => i + 7) // 7am a 8pm
const SALONES_DEFAULT = ['Beat', 'Movich']

function horaEnRango(hora: number, h: Horario) {
  const inicio = parseInt(h.hora_inicio.slice(0, 2))
  const fin = parseInt(h.hora_fin.slice(0, 2))
  return hora >= inicio && hora < fin
}

function Disponibilidad({ horarios, getNombre }: { horarios: Horario[]; getNombre: (h: Horario) => string }) {
  const salonesUsados = [...new Set(horarios.map(h => h.salon).filter((s): s is string => !!s))]
  const salones = [...new Set([...SALONES_DEFAULT, ...salonesUsados])]
  const sinSalon = horarios.filter(h => !h.salon)

  return (
    <div className="space-y-6">
      <p className="text-white/40 text-xs">
        Celdas vacías = horario libre. {sinSalon.length > 0 && `${sinSalon.length} clase${sinSalon.length !== 1 ? 's' : ''} sin salón asignado (columna "Sin asignar").`}
      </p>
      {DIAS.slice(1, 7).map((dia, idx) => {
        const diaNum = idx + 1
        const hsDelDia = horarios.filter(h => h.dia_semana === diaNum)
        if (hsDelDia.length === 0) return null
        const columnas = [...salones, 'Sin asignar']
        return (
          <div key={diaNum}>
            <h2 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-2">{dia}</h2>
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-white/40 px-3 py-2 w-16">Hora</th>
                    {columnas.map(s => (
                      <th key={s} className="text-left text-white/40 px-3 py-2">{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HORAS.map(hora => (
                    <tr key={hora} className="border-b border-white/5">
                      <td className="px-3 py-2 text-white/30 font-mono">{String(hora).padStart(2, '0')}:00</td>
                      {columnas.map(col => {
                        const ocupado = hsDelDia.find(h => horaEnRango(hora, h) && (col === 'Sin asignar' ? !h.salon : h.salon === col))
                        return (
                          <td key={col} className={`px-3 py-2 ${ocupado ? 'bg-[#e91e8c]/15 text-[#e91e8c]' : 'text-white/15'}`}>
                            {ocupado ? getNombre(ocupado) : 'Libre'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
