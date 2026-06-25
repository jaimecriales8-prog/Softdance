'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Actividad = {
  id: string; nombre: string; descripcion: string | null
  precio: number; precio_media: number | null; precio_cuarto: number | null
  es_recurrente: boolean; activa: boolean
}

type Alumna = {
  id: string; nombre: string; fecha_nacimiento: string | null
  alumna_actividad: { actividad_id: string; tipo_asistencia?: string }[]
}

const EMPTY = { nombre: '', descripcion: '', precio: '', precio_media: '', precio_cuarto: '', es_recurrente: true }

function calcularEdad(fecha: string) {
  const hoy = new Date(); const nac = new Date(fecha)
  let edad = hoy.getFullYear() - nac.getFullYear()
  if (hoy < new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate())) edad--
  return edad
}

export default function ActividadesClient({ actividades: inicial, alumnas: todasAlumnas, escuelaId }: {
  actividades: Actividad[]; alumnas: Alumna[]; escuelaId: string
}) {
  const [actividades, setActividades] = useState(inicial)
  const [alumnas, setAlumnas] = useState(todasAlumnas)
  const [modal, setModal] = useState<'crear' | 'editar' | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [seleccionada, setSeleccionada] = useState<Actividad | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [togglingAlumna, setTogglingAlumna] = useState<string | null>(null)
  const [tipoAsistencia, setTipoAsistencia] = useState<Record<string, 'completo' | 'media' | 'cuarto'>>({})

  const supabase = createClient()

  function abrirCrear() { setForm(EMPTY); setEditId(null); setModal('crear') }
  function abrirEditar(a: Actividad) {
    setForm({ nombre: a.nombre, descripcion: a.descripcion ?? '', precio: a.precio.toString(), precio_media: a.precio_media?.toString() ?? '', precio_cuarto: a.precio_cuarto?.toString() ?? '', es_recurrente: a.es_recurrente })
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
      precio_media: form.precio_media ? parseInt(form.precio_media) : null,
      precio_cuarto: form.precio_cuarto ? parseInt(form.precio_cuarto) : null,
      es_recurrente: form.es_recurrente,
    }
    if (modal === 'crear') {
      const { data, error } = await supabase.from('actividades_extra')
        .insert({ ...payload, activa: true }).select().single()
      if (!error && data) setActividades([...actividades, data].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    } else if (editId) {
      const { data, error } = await supabase.from('actividades_extra')
        .update(payload).eq('id', editId).select().single()
      if (!error && data) {
        setActividades(actividades.map(a => a.id === editId ? data : a))
        if (seleccionada?.id === editId) setSeleccionada(data)
      }
    }
    cerrar(); setLoading(false)
  }

  async function toggleActiva(a: Actividad) {
    await supabase.from('actividades_extra').update({ activa: !a.activa }).eq('id', a.id)
    const updated = { ...a, activa: !a.activa }
    setActividades(actividades.map(x => x.id === a.id ? updated : x))
    if (seleccionada?.id === a.id) setSeleccionada(updated)
  }

  async function eliminarActividad(a: Actividad) {
    if (!confirm(`¿Eliminar la actividad "${a.nombre}"? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('horarios').delete().eq('actividad_id', a.id)
    if (error) { alert('No se pudo eliminar la actividad: ' + error.message); return }
    const { error: errorAct } = await supabase.from('actividades_extra').delete().eq('id', a.id)
    if (errorAct) { alert('No se pudo eliminar: la actividad tiene alumnas asignadas o historial. Desactívala en su lugar.'); return }
    setActividades(actividades.filter(x => x.id !== a.id))
    if (seleccionada?.id === a.id) setSeleccionada(null)
  }

  async function toggleAlumna(alumna: Alumna) {
    if (!seleccionada) return
    setTogglingAlumna(alumna.id)
    const tiene = alumna.alumna_actividad.some(aa => aa.actividad_id === seleccionada.id)
    try {
      if (tiene) {
        await fetch(`/api/escuela/alumnas/actividades?alumna_id=${alumna.id}&actividad_id=${seleccionada.id}`, { method: 'DELETE' })
        setAlumnas(prev => prev.map(a => a.id === alumna.id
          ? { ...a, alumna_actividad: a.alumna_actividad.filter(aa => aa.actividad_id !== seleccionada.id) }
          : a))
      } else {
        const ta = tipoAsistencia[alumna.id] ?? 'completo'
        await fetch('/api/escuela/alumnas/actividades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alumna_id: alumna.id, actividad_id: seleccionada.id, tipo_asistencia: ta }),
        })
        setAlumnas(prev => prev.map(a => a.id === alumna.id
          ? { ...a, alumna_actividad: [...a.alumna_actividad, { actividad_id: seleccionada.id, tipo_asistencia: ta }] }
          : a))
      }
    } finally {
      setTogglingAlumna(null)
    }
  }

  const activas = actividades.filter(a => a.activa)
  const inactivas = actividades.filter(a => !a.activa)

  const alumnasFiltradas = alumnas.filter(a =>
    a.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )
  const conActividad = seleccionada ? alumnas.filter(a => a.alumna_actividad.some(aa => aa.actividad_id === seleccionada.id)) : []
  const tieneOpciones = seleccionada && (seleccionada.precio_media != null || seleccionada.precio_cuarto != null)

  return (
    <div className="flex gap-6">
      {/* Lista actividades */}
      <div className={`flex flex-col min-w-0 transition-all ${seleccionada ? 'w-[55%]' : 'w-full'}`}>
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
                  <label className="block text-xs text-white/50 mb-1">Precio completo (COP) *</label>
                  <input type="number" required value={form.precio} onChange={e => setForm({ ...form, precio: e.target.value })}
                    placeholder="0"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Precio ½ <span className="text-white/20">— opcional</span></label>
                    <input type="number" value={form.precio_media} onChange={e => setForm({ ...form, precio_media: e.target.value })}
                      placeholder="Vacío si no aplica"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Precio ¼ <span className="text-white/20">— opcional</span></label>
                    <input type="number" value={form.precio_cuarto} onChange={e => setForm({ ...form, precio_cuarto: e.target.value })}
                      placeholder="Vacío si no aplica"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
                  </div>
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
                  {!seleccionada && <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Tipo</th>}
                  {!seleccionada && <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Alumnas</th>}
                  <th className="text-center text-white/40 text-xs uppercase tracking-wider px-4 py-3">Activa</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {actividades.map((a, i) => {
                  const numAlumnas = alumnas.filter(al => al.alumna_actividad.some(aa => aa.actividad_id === a.id)).length
                  return (
                    <tr key={a.id}
                      onClick={() => setSeleccionada(sel => sel?.id === a.id ? null : a)}
                      className={`${i < actividades.length - 1 ? 'border-b border-white/5' : ''} cursor-pointer transition-colors ${seleccionada?.id === a.id ? 'bg-[#e91e8c]/5 border-l-2 border-l-[#e91e8c]' : 'hover:bg-white/5'}`}>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{a.nombre}</p>
                        {a.descripcion && <p className="text-white/40 text-xs">{a.descripcion}</p>}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        <span>${a.precio.toLocaleString('es-CO')}</span>
                        {a.precio_media != null && <span className="text-white/30 text-xs ml-1">· ½${a.precio_media.toLocaleString('es-CO')}</span>}
                        {a.precio_cuarto != null && <span className="text-white/30 text-xs ml-1">· ¼${a.precio_cuarto.toLocaleString('es-CO')}</span>}
                      </td>
                      {!seleccionada && (
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${a.es_recurrente ? 'bg-white/10 text-white/50' : 'bg-[#e91e8c]/10 text-[#e91e8c]'}`}>
                            {a.es_recurrente ? 'Mensual' : 'Único'}
                          </span>
                        </td>
                      )}
                      {!seleccionada && (
                        <td className="px-4 py-3 text-white/50 text-xs">{numAlumnas} {numAlumnas === 1 ? 'alumna' : 'alumnas'}</td>
                      )}
                      <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <button onClick={() => toggleActiva(a)}
                          className={`w-10 h-5 rounded-full transition-colors ${a.activa ? 'bg-[#e91e8c]' : 'bg-white/20'}`}>
                          <span className={`block w-4 h-4 bg-white rounded-full mx-auto transition-transform ${a.activa ? 'translate-x-2.5' : '-translate-x-2.5'}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <button onClick={() => abrirEditar(a)}
                          className="text-xs text-white/40 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5">Editar</button>
                        <button onClick={() => eliminarActividad(a)}
                          className="text-xs text-white/40 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10">Eliminar</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Panel alumnas */}
      {seleccionada && (
        <div className="w-[45%] shrink-0">
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 sticky top-8">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-white font-bold">{seleccionada.nombre}</h2>
              <button onClick={() => { setSeleccionada(null); setBusqueda('') }} className="text-white/30 hover:text-white text-xl leading-none">×</button>
            </div>
            <p className="text-white/40 text-xs mb-4">
              {conActividad.length} alumna{conActividad.length !== 1 ? 's' : ''} asignada{conActividad.length !== 1 ? 's' : ''} · ${seleccionada.precio.toLocaleString('es-CO')} {seleccionada.es_recurrente ? '/ mes' : 'único'}
            </p>

            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar alumna..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c] mb-3" />

            <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
              {alumnasFiltradas.map(a => {
                const tiene = a.alumna_actividad.some(aa => aa.actividad_id === seleccionada.id)
                const taActual = a.alumna_actividad.find(aa => aa.actividad_id === seleccionada.id)?.tipo_asistencia
                return (
                  <div key={a.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      togglingAlumna === a.id ? 'opacity-50' : ''
                    } ${tiene ? 'bg-purple-500/10' : 'hover:bg-white/5'}`}>
                    <div onClick={() => toggleAlumna(a)} className="cursor-pointer flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors ${
                        tiene ? 'bg-purple-500 border-purple-500' : 'border-white/20'
                      }`}>
                        {tiene && <span className="text-white text-xs">✓</span>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate">{a.nombre}</p>
                        {a.fecha_nacimiento && (
                          <p className="text-white/40 text-xs">{calcularEdad(a.fecha_nacimiento)} años</p>
                        )}
                      </div>
                    </div>
                    {/* Selector de tipo si no está asignada y la actividad tiene precios parciales */}
                    {!tiene && tieneOpciones && (
                      <select
                        value={tipoAsistencia[a.id] ?? 'completo'}
                        onChange={e => setTipoAsistencia(prev => ({ ...prev, [a.id]: e.target.value as any }))}
                        onClick={e => e.stopPropagation()}
                        className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white focus:outline-none focus:border-[#e91e8c] shrink-0">
                        <option value="completo">Completo</option>
                        {seleccionada.precio_media != null && <option value="media">½</option>}
                        {seleccionada.precio_cuarto != null && <option value="cuarto">¼</option>}
                      </select>
                    )}
                    {/* Badge del tipo actual si ya está asignada */}
                    {tiene && taActual && taActual !== 'completo' && (
                      <span className="text-xs text-white/40 bg-white/10 px-1.5 py-0.5 rounded shrink-0">
                        {taActual === 'media' ? '½' : '¼'}
                      </span>
                    )}
                  </div>
                )
              })}
              {alumnasFiltradas.length === 0 && (
                <p className="text-white/30 text-sm text-center py-6">Sin resultados</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
