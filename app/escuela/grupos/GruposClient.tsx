'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Grupo = {
  id: string
  nombre: string
  edad_min: number | null
  edad_max: number | null
  descripcion: string | null
  es_elite: boolean
  cupo_maximo: number | null
  precio_mensual: number
  precio_media: number | null
  precio_cuarto: number | null
  activo: boolean
  profesores?: string[]
  salones?: string[]
}

type AlumnaEnGrupo = {
  id: string
  fecha_inicio: string
  alumnas: { id: string; nombre: string; fecha_nacimiento: string | null; familias: { nombre: string } | null }
}

type AlumnaDisponible = {
  id: string
  nombre: string
  fecha_nacimiento: string | null
  familias: { nombre: string } | null
}

type FormData = {
  nombre: string
  edad_min: string
  edad_max: string
  descripcion: string
  es_elite: boolean
  cupo_maximo: string
  precio_mensual: string
  precio_media: string
  precio_cuarto: string
}

const EMPTY: FormData = { nombre: '', edad_min: '', edad_max: '', descripcion: '', es_elite: false, cupo_maximo: '', precio_mensual: '', precio_media: '', precio_cuarto: '' }

function calcularEdad(fecha: string) {
  const hoy = new Date()
  const nac = new Date(fecha)
  let edad = hoy.getFullYear() - nac.getFullYear()
  if (hoy < new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate())) edad--
  return edad
}

export default function GruposClient({ grupos: inicial, escuelaId }: { grupos: Grupo[]; escuelaId: string }) {
  const [grupos, setGrupos] = useState(inicial)
  const [modal, setModal] = useState<'crear' | 'editar' | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Panel alumnas
  const [grupoActivo, setGrupoActivo] = useState<Grupo | null>(null)
  const [alumnas, setAlumnas] = useState<AlumnaEnGrupo[]>([])
  const [disponibles, setDisponibles] = useState<AlumnaDisponible[]>([])
  const [panelLoading, setPanelLoading] = useState(false)
  const [agregando, setAgregando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [panelError, setPanelError] = useState('')
  const [agregandoId, setAgregandoId] = useState<string | null>(null)
  const [tipoAsistencia, setTipoAsistencia] = useState<Record<string, 'completo' | 'media' | 'cuarto'>>({})

  const supabase = createClient()

  function abrirCrear() { setForm(EMPTY); setEditId(null); setModal('crear') }

  function abrirEditar(g: Grupo) {
    setForm({
      nombre: g.nombre,
      edad_min: g.edad_min?.toString() ?? '',
      edad_max: g.edad_max?.toString() ?? '',
      descripcion: g.descripcion ?? '',
      es_elite: g.es_elite,
      cupo_maximo: g.cupo_maximo?.toString() ?? '',
      precio_mensual: g.precio_mensual.toString(),
      precio_media: g.precio_media?.toString() ?? '',
      precio_cuarto: g.precio_cuarto?.toString() ?? '',
    })
    setEditId(g.id)
    setModal('editar')
  }

  function cerrar() { setModal(null); setEditId(null); setForm(EMPTY) }

  function parseForm() {
    return {
      nombre: form.nombre,
      edad_min: form.edad_min ? parseInt(form.edad_min) : null,
      edad_max: form.edad_max ? parseInt(form.edad_max) : null,
      descripcion: form.descripcion || null,
      es_elite: form.es_elite,
      cupo_maximo: form.cupo_maximo ? parseInt(form.cupo_maximo) : null,
      precio_mensual: parseFloat(form.precio_mensual) || 0,
      precio_media: form.precio_media ? parseInt(form.precio_media) : null,
      precio_cuarto: form.precio_cuarto ? parseInt(form.precio_cuarto) : null,
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    if (modal === 'crear') {
      const { data, error } = await supabase.from('grupos')
        .insert({ ...parseForm(), escuela_id: escuelaId, activo: true })
        .select().single()
      if (!error && data) setGrupos([...grupos, data])
    } else if (editId) {
      const { data, error } = await supabase.from('grupos')
        .update(parseForm()).eq('id', editId).select().single()
      if (!error && data) setGrupos(grupos.map(g => g.id === editId ? data : g))
    }
    cerrar()
    setLoading(false)
  }

  async function toggleActivo(g: Grupo) {
    await supabase.from('grupos').update({ activo: !g.activo }).eq('id', g.id)
    setGrupos(grupos.map(x => x.id === g.id ? { ...x, activo: !g.activo } : x))
  }

  async function eliminarGrupo(g: Grupo) {
    if (!confirm(`¿Eliminar el grupo "${g.nombre}"? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.from('horarios').delete().eq('grupo_id', g.id)
    if (error) { alert('No se pudo eliminar el grupo: ' + error.message); return }
    const { error: errorGrupo } = await supabase.from('grupos').delete().eq('id', g.id)
    if (errorGrupo) {
      alert('No se pudo eliminar: el grupo tiene alumnas o historial asociado. Desactívalo en su lugar.')
      return
    }
    setGrupos(grupos.filter(x => x.id !== g.id))
    if (grupoActivo?.id === g.id) setGrupoActivo(null)
  }

  async function abrirPanel(g: Grupo) {
    setGrupoActivo(g)
    setPanelLoading(true)
    setBusqueda('')
    setAgregando(false)
    const res = await fetch(`/api/escuela/grupos/alumnas?grupo_id=${g.id}`)
    const data = await res.json()
    setAlumnas(data.alumnas ?? [])
    setPanelLoading(false)
  }

  async function cargarDisponibles() {
    if (!grupoActivo) return
    setAgregando(true)
    const res = await fetch(`/api/escuela/grupos/alumnas?grupo_id=${grupoActivo.id}&disponibles=1`)
    const data = await res.json()
    setDisponibles(data.alumnas ?? [])
    setBusqueda('')
  }

  async function agregarAlumna(alumna: AlumnaDisponible) {
    if (!grupoActivo) return
    setPanelError('')
    setAgregandoId(alumna.id)
    const res = await fetch('/api/escuela/grupos/alumnas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alumna_id: alumna.id, grupo_id: grupoActivo.id, tipo_asistencia: tipoAsistencia[alumna.id] ?? 'completo' }),
    })
    const data = await res.json()
    setAgregandoId(null)
    if (res.ok) {
      setAlumnas(prev => [...prev, data.alumna_grupo])
      setDisponibles(prev => prev.filter(a => a.id !== alumna.id))
    } else {
      setPanelError(data.error ?? 'Error al agregar')
    }
  }

  async function removerAlumna(ag: AlumnaEnGrupo) {
    if (!grupoActivo) return
    await fetch('/api/escuela/grupos/alumnas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alumna_id: ag.alumnas.id, grupo_id: grupoActivo.id }),
    })
    setAlumnas(prev => prev.filter(a => a.id !== ag.id))
  }

  const normales = grupos.filter(g => !g.es_elite)
  const elite = grupos.filter(g => g.es_elite)

  const disponiblesFiltradas = disponibles.filter(a =>
    a.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (a.familias?.nombre ?? '').toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="flex gap-6">
      {/* Lista de grupos */}
      <div className={`transition-all ${grupoActivo ? 'w-1/2' : 'w-full'}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Grupos</h1>
            <p className="text-white/40 text-sm mt-0.5">{grupos.length} grupos en total</p>
          </div>
          <button onClick={abrirCrear}
            className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Nuevo grupo
          </button>
        </div>

        {/* Modal crear/editar */}
        {modal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold text-white mb-4">
                {modal === 'crear' ? 'Nuevo grupo' : 'Editar grupo'}
              </h2>
              <form onSubmit={guardar} className="space-y-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Nombre *</label>
                  <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej: Iniciación 4-6 años"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Edad mínima</label>
                    <input type="number" value={form.edad_min} onChange={e => setForm({ ...form, edad_min: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Edad máxima</label>
                    <input type="number" value={form.edad_max} onChange={e => setForm({ ...form, edad_max: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Cupo máximo</label>
                    <input type="number" value={form.cupo_maximo} onChange={e => setForm({ ...form, cupo_maximo: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Precio mensual (COP)</label>
                    <input type="number" value={form.precio_mensual} onChange={e => setForm({ ...form, precio_mensual: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Precio ½ asistencia <span className="text-white/20">— opcional</span></label>
                    <input type="number" value={form.precio_media} onChange={e => setForm({ ...form, precio_media: e.target.value })}
                      placeholder="Vacío si no aplica"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Precio ¼ asistencia <span className="text-white/20">— opcional</span></label>
                    <input type="number" value={form.precio_cuarto} onChange={e => setForm({ ...form, precio_cuarto: e.target.value })}
                      placeholder="Vacío si no aplica"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-white/50 mb-1">Descripción</label>
                  <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c] resize-none" />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.es_elite} onChange={e => setForm({ ...form, es_elite: e.target.checked })}
                    className="accent-[#e91e8c]" />
                  <span className="text-sm text-white/70">Grupo élite</span>
                </label>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={cerrar}
                    className="flex-1 border border-white/10 text-white/60 text-sm py-2 rounded-lg hover:bg-white/5 transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={loading}
                    className="flex-1 bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm py-2 rounded-lg disabled:opacity-50 transition-colors">
                    {loading ? 'Guardando...' : modal === 'crear' ? 'Crear grupo' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Grupos normales */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-3">Grupos por edad</h2>
          <GruposTabla grupos={normales} onEditar={abrirEditar} onToggle={toggleActivo} onVerAlumnas={abrirPanel} onEliminar={eliminarGrupo} grupoSeleccionado={grupoActivo?.id ?? null} />
        </div>

        {/* Grupos élite */}
        <div>
          <h2 className="text-sm font-medium text-[#e91e8c]/70 uppercase tracking-wider mb-3">Grupos élite</h2>
          <GruposTabla grupos={elite} onEditar={abrirEditar} onToggle={toggleActivo} onVerAlumnas={abrirPanel} onEliminar={eliminarGrupo} grupoSeleccionado={grupoActivo?.id ?? null} elite />
        </div>
      </div>

      {/* Panel alumnas del grupo */}
      {grupoActivo && (
        <div className="w-1/2 sticky top-8 self-start">
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">{grupoActivo.nombre}</h2>
                <p className="text-xs text-white/40 mt-0.5">{alumnas.length} alumna{alumnas.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex gap-2">
                <Link href="/escuela/horarios"
                  className="text-white/40 hover:text-white text-xs px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors border border-white/10">
                  Horarios
                </Link>
                {!agregando && (
                  <button onClick={cargarDisponibles}
                    className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
                    + Agregar
                  </button>
                )}
                <button onClick={() => { setGrupoActivo(null); setAgregando(false) }}
                  className="text-white/40 hover:text-white text-xs px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                  ✕
                </button>
              </div>
            </div>

            {panelLoading ? (
              <div className="py-10 text-center text-white/30 text-sm">Cargando...</div>
            ) : agregando ? (
              <div>
                <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Buscar alumna o familia..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    autoFocus
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]"
                  />
                  <button onClick={() => setAgregando(false)} className="text-white/40 hover:text-white text-xs transition-colors">
                    Cancelar
                  </button>
                </div>
                {panelError && <p className="px-5 py-2 text-xs text-red-400">{panelError}</p>}
                {disponiblesFiltradas.length === 0 ? (
                  <p className="text-center text-white/30 text-sm py-8">
                    {disponibles.length === 0 ? 'Todas las alumnas ya están en este grupo' : 'No se encontraron resultados'}
                  </p>
                ) : (
                  <ul className="divide-y divide-white/5 max-h-96 overflow-y-auto">
                    {disponiblesFiltradas.map(a => (
                      <li key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white">{a.nombre}</p>
                          <p className="text-xs text-white/40">
                            {a.familias?.nombre ?? 'Sin familia'}
                            {a.fecha_nacimiento ? ` · ${calcularEdad(a.fecha_nacimiento)} años` : ''}
                          </p>
                        </div>
                        {(grupoActivo?.precio_media != null || grupoActivo?.precio_cuarto != null) && (
                          <select
                            value={tipoAsistencia[a.id] ?? 'completo'}
                            onChange={e => setTipoAsistencia(prev => ({ ...prev, [a.id]: e.target.value as 'completo' | 'media' | 'cuarto' }))}
                            className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white focus:outline-none focus:border-[#e91e8c]">
                            <option value="completo">Completo</option>
                            {grupoActivo?.precio_media != null && <option value="media">½ asistencia</option>}
                            {grupoActivo?.precio_cuarto != null && <option value="cuarto">¼ asistencia</option>}
                          </select>
                        )}
                        <button onClick={() => agregarAlumna(a)} disabled={agregandoId === a.id}
                          className="text-xs bg-[#e91e8c]/10 text-[#e91e8c] hover:bg-[#e91e8c]/20 px-3 py-1 rounded-lg transition-colors disabled:opacity-50 shrink-0">
                          {agregandoId === a.id ? '...' : 'Agregar'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : alumnas.length === 0 ? (
              <p className="text-center text-white/30 text-sm py-10">No hay alumnas en este grupo aún</p>
            ) : (
              <ul className="divide-y divide-white/5 max-h-[28rem] overflow-y-auto">
                {alumnas.map(ag => (
                  <li key={ag.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors group">
                    <div>
                      <p className="text-sm text-white">{ag.alumnas.nombre}</p>
                      <p className="text-xs text-white/40">
                        {ag.alumnas.familias?.nombre ?? 'Sin familia'}
                        {ag.alumnas.fecha_nacimiento ? ` · ${calcularEdad(ag.alumnas.fecha_nacimiento)} años` : ''}
                      </p>
                    </div>
                    <button onClick={() => removerAlumna(ag)}
                      className="text-xs text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all px-2 py-1 rounded">
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function GruposTabla({ grupos, onEditar, onToggle, onVerAlumnas, onEliminar, grupoSeleccionado, elite }: {
  grupos: Grupo[]
  onEditar: (g: Grupo) => void
  onToggle: (g: Grupo) => void
  onVerAlumnas: (g: Grupo) => void
  onEliminar: (g: Grupo) => void
  grupoSeleccionado: string | null
  elite?: boolean
}) {
  if (grupos.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-8 text-center text-white/30 text-sm">
        {elite ? 'No hay grupos élite creados' : 'No hay grupos creados'}
      </div>
    )
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Nombre</th>
            <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Edades</th>
            <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Cupo</th>
            <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Precio / mes</th>
            <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Profesor</th>
            <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Salón</th>
            <th className="text-center text-white/40 text-xs uppercase tracking-wider px-4 py-3">Activo</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {grupos.map(g => (
            <tr key={g.id}
              className={`border-b border-white/5 transition-colors cursor-pointer ${grupoSeleccionado === g.id ? 'bg-[#e91e8c]/5 border-l-2 border-l-[#e91e8c]' : 'hover:bg-white/5'}`}
              onClick={() => onVerAlumnas(g)}>
              <td className="px-4 py-3">
                <p className="text-white font-medium">{g.nombre}</p>
                {g.descripcion && <p className="text-white/40 text-xs">{g.descripcion}</p>}
              </td>
              <td className="px-4 py-3 text-white/60">
                {g.edad_min && g.edad_max ? `${g.edad_min} - ${g.edad_max} años` : '—'}
              </td>
              <td className="px-4 py-3 text-white/60">{g.cupo_maximo ?? '—'}</td>
              <td className="px-4 py-3 text-white/60">
                {g.precio_mensual > 0 ? `$${g.precio_mensual.toLocaleString('es-CO')}` : '—'}
              </td>
              <td className="px-4 py-3 text-white/60 text-xs">
                {(g.profesores ?? []).length > 0 ? (g.profesores ?? []).join(', ') : '—'}
              </td>
              <td className="px-4 py-3 text-xs">
                {(g.salones ?? []).length > 0
                  ? (g.salones ?? []).map(s => (
                    <span key={s} className="inline-block bg-white/8 text-white/60 px-2 py-0.5 rounded-full mr-1">{s}</span>
                  ))
                  : <span className="text-white/30">—</span>}
              </td>
              <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                <button onClick={() => onToggle(g)}
                  className={`w-10 h-5 rounded-full transition-colors ${g.activo ? 'bg-[#e91e8c]' : 'bg-white/20'}`}>
                  <span className={`block w-4 h-4 bg-white rounded-full mx-auto transition-transform ${g.activo ? 'translate-x-2.5' : '-translate-x-2.5'}`} />
                </button>
              </td>
              <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                <button onClick={() => onEditar(g)}
                  className="text-xs text-white/40 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5">
                  Editar
                </button>
                <button onClick={() => onEliminar(g)}
                  className="text-xs text-white/40 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10">
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
