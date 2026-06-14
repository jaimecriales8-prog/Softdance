'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

type Grupo = { id: string; nombre: string; es_elite: boolean }
type Horario = {
  id: string; grupo_id: string; dia_semana: number
  hora_inicio: string; hora_fin: string
  salon: string | null; profesora: string | null
  grupos: Grupo | Grupo[]
}

const EMPTY = { grupo_id: '', dia_semana: '1', hora_inicio: '08:00', hora_fin: '09:00', salon: '', profesora: '' }

function getGrupo(h: Horario): Grupo {
  return Array.isArray(h.grupos) ? h.grupos[0] : h.grupos
}

export default function HorariosClient({ horarios: inicial, grupos, escuelaId }: {
  horarios: Horario[]; grupos: Grupo[]; escuelaId: string
}) {
  const [horarios, setHorarios] = useState(inicial)
  const [modal, setModal] = useState<'crear' | 'editar' | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  function abrirCrear() { setForm(EMPTY); setEditId(null); setModal('crear') }
  function abrirEditar(h: Horario) {
    setForm({
      grupo_id: h.grupo_id,
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
      grupo_id: form.grupo_id,
      dia_semana: parseInt(form.dia_semana),
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
      salon: form.salon || null,
      profesora: form.profesora || null,
    }

    if (modal === 'crear') {
      const { data, error } = await supabase.from('horarios').insert(payload)
        .select('*, grupos(id, nombre, es_elite)').single()
      if (!error && data) setHorarios([...horarios, data].sort((a, b) => a.dia_semana - b.dia_semana || a.hora_inicio.localeCompare(b.hora_inicio)))
    } else if (editId) {
      const { data, error } = await supabase.from('horarios').update(payload)
        .eq('id', editId).select('*, grupos(id, nombre, es_elite)').single()
      if (!error && data) setHorarios(horarios.map(h => h.id === editId ? data : h))
    }
    cerrar(); setLoading(false)
  }

  async function eliminar(id: string) {
    await supabase.from('horarios').delete().eq('id', id)
    setHorarios(horarios.filter(h => h.id !== id))
  }

  // Agrupar por día
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
        <button onClick={abrirCrear}
          className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Nueva clase
        </button>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-4">
              {modal === 'crear' ? 'Nueva clase' : 'Editar clase'}
            </h2>
            <form onSubmit={guardar} className="space-y-3">
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
                  <input value={form.salon} onChange={e => setForm({ ...form, salon: e.target.value })}
                    placeholder="Ej: Salón A"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
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

      {/* Vista por día */}
      {horarios.length === 0 ? (
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
                      return (
                        <tr key={h.id} className={`${i < hs.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/5 transition-colors`}>
                          <td className="px-4 py-3 w-28">
                            <p className="text-white font-mono text-sm">{h.hora_inicio.slice(0, 5)} – {h.hora_fin.slice(0, 5)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-white font-medium">{g?.nombre}</p>
                            {g?.es_elite && <span className="text-[#e91e8c] text-xs">élite</span>}
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
