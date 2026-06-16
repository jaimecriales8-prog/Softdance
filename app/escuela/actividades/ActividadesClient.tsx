'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Actividad = {
  id: string; nombre: string; descripcion: string | null
  precio: number; es_recurrente: boolean; activa: boolean
}

const EMPTY = { nombre: '', descripcion: '', precio: '', es_recurrente: true }

export default function ActividadesClient({ actividades: inicial, escuelaId }: {
  actividades: Actividad[]; escuelaId: string
}) {
  const [actividades, setActividades] = useState(inicial)
  const [modal, setModal] = useState<'crear' | 'editar' | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  function abrirCrear() { setForm(EMPTY); setEditId(null); setModal('crear') }
  function abrirEditar(a: Actividad) {
    setForm({ nombre: a.nombre, descripcion: a.descripcion ?? '', precio: a.precio.toString(), es_recurrente: a.es_recurrente })
    setEditId(a.id); setModal('editar')
  }
  function cerrar() { setModal(null); setEditId(null) }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload = {
      escuela_id: escuelaId,
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      precio: parseFloat(form.precio) || 0,
      es_recurrente: form.es_recurrente,
    }
    if (modal === 'crear') {
      const { data, error } = await supabase.from('actividades_extra')
        .insert({ ...payload, activa: true }).select().single()
      if (!error && data) setActividades([...actividades, data])
    } else if (editId) {
      const { data, error } = await supabase.from('actividades_extra')
        .update(payload).eq('id', editId).select().single()
      if (!error && data) setActividades(actividades.map(a => a.id === editId ? data : a))
    }
    cerrar(); setLoading(false)
  }

  async function toggleActiva(a: Actividad) {
    await supabase.from('actividades_extra').update({ activa: !a.activa }).eq('id', a.id)
    setActividades(actividades.map(x => x.id === a.id ? { ...x, activa: !a.activa } : x))
  }

  async function eliminarActividad(a: Actividad) {
    if (!confirm(`¿Eliminar la actividad "${a.nombre}"? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('horarios').delete().eq('actividad_id', a.id)
    if (error) { alert('No se pudo eliminar la actividad: ' + error.message); return }
    const { error: errorAct } = await supabase.from('actividades_extra').delete().eq('id', a.id)
    if (errorAct) {
      alert('No se pudo eliminar: la actividad tiene alumnas asignadas o historial. Desactívala en su lugar.')
      return
    }
    setActividades(actividades.filter(x => x.id !== a.id))
  }

  const activas = actividades.filter(a => a.activa)
  const inactivas = actividades.filter(a => !a.activa)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Actividades extra</h1>
          <p className="text-white/40 text-sm mt-0.5">{activas.length} activas · {inactivas.length} inactivas</p>
        </div>
        <button onClick={abrirCrear}
          className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Nueva actividad
        </button>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-4">
              {modal === 'crear' ? 'Nueva actividad extra' : 'Editar actividad'}
            </h2>
            <form onSubmit={guardar} className="space-y-3">
              <div>
                <label className="block text-xs text-white/50 mb-1">Nombre *</label>
                <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Clases de teatro, Acrobacia..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Descripción</label>
                <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c] resize-none" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Precio (COP) *</label>
                <input type="number" required value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })}
                  placeholder="0"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.es_recurrente}
                  onChange={e => setForm({ ...form, es_recurrente: e.target.checked })}
                  className="accent-[#e91e8c]" />
                <span className="text-sm text-white/70">Cobro mensual recurrente</span>
              </label>
              <p className="text-xs text-white/30">
                {form.es_recurrente ? 'Se suma a la mensualidad cada mes.' : 'Pago único al asignar la actividad.'}
              </p>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={cerrar}
                  className="flex-1 border border-white/10 text-white/60 text-sm py-2 rounded-lg hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm py-2 rounded-lg disabled:opacity-50 transition-colors">
                  {loading ? 'Guardando...' : modal === 'crear' ? 'Crear' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista */}
      {actividades.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-12 text-center text-white/30 text-sm">
          No hay actividades extra creadas aún
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Actividad</th>
                <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Precio</th>
                <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Tipo</th>
                <th className="text-center text-white/40 text-xs uppercase tracking-wider px-4 py-3">Activa</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {actividades.map((a, i) => (
                <tr key={a.id} className={`${i < actividades.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/5 transition-colors`}>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{a.nombre}</p>
                    {a.descripcion && <p className="text-white/40 text-xs">{a.descripcion}</p>}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    ${a.precio.toLocaleString('es-CO')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${a.es_recurrente ? 'bg-white/10 text-white/50' : 'bg-[#e91e8c]/10 text-[#e91e8c]'}`}>
                      {a.es_recurrente ? 'Mensual' : 'Único'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleActiva(a)}
                      className={`w-10 h-5 rounded-full transition-colors ${a.activa ? 'bg-[#e91e8c]' : 'bg-white/20'}`}>
                      <span className={`block w-4 h-4 bg-white rounded-full mx-auto transition-transform ${a.activa ? 'translate-x-2.5' : '-translate-x-2.5'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => abrirEditar(a)}
                      className="text-xs text-white/40 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5">
                      Editar
                    </button>
                    <button onClick={() => eliminarActividad(a)}
                      className="text-xs text-white/40 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
