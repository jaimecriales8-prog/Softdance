'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

type Grupo = { id: string; nombre: string; es_elite: boolean; precio_media?: number | null; precio_cuarto?: number | null }
type Alumna = {
  id: string
  nombre: string
  fecha_nacimiento: string | null
  activa: boolean
  congelada: boolean
  codigo_vinculacion: string | null
  descuento_mensual: number | null
  familias: { id: string; nombre: string; email: string; telefono: string | null } | null
  alumna_grupo: { activo: boolean; tipo_asistencia?: string; grupos: Grupo }[]
  alumna_actividad: { actividades_extra: { id: string; nombre: string } }[]
}

const POR_PAGINA = 20

function calcularEdad(fecha: string) {
  const hoy = new Date()
  const nac = new Date(fecha)
  let edad = hoy.getFullYear() - nac.getFullYear()
  if (hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) edad--
  return edad
}

function gruposActivos(a: Alumna) {
  return a.alumna_grupo.filter(ag => ag.activo).map(ag => ag.grupos)
}

type Familia = { id: string; nombre: string }
type Actividad = { id: string; nombre: string; es_recurrente: boolean; precio_media?: number | null; precio_cuarto?: number | null }

export default function AlumnasClient({ alumnas, grupos, familias, actividades, escuelaId }: { alumnas: Alumna[]; grupos: Grupo[]; familias: Familia[]; actividades: Actividad[]; escuelaId: string }) {
  const [busqueda, setBusqueda] = useState('')
  const [filtroGrupo, setFiltroGrupo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'activas' | 'sin_familia'>('todas')
  const [pagina, setPagina] = useState(1)
  const [seleccionada, setSeleccionada] = useState<Alumna | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [lista, setLista] = useState(alumnas)
  const [eliminando, setEliminando] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [editandoDescuento, setEditandoDescuento] = useState(false)
  const [descuentoInput, setDescuentoInput] = useState('')
  const [savingDescuento, setSavingDescuento] = useState(false)
  const [togglingActividad, setTogglingActividad] = useState<string | null>(null)
  const [tipoAsistAct, setTipoAsistAct] = useState<Record<string, 'completo' | 'media' | 'cuarto'>>({})
  const [togglingGrupoElite, setTogglingGrupoElite] = useState<string | null>(null)
  const [asignandoGrupo, setAsignandoGrupo] = useState(false)
  const [grupoSelId, setGrupoSelId] = useState('')
  const [tipoAsistSel, setTipoAsistSel] = useState<'completo' | 'media' | 'cuarto'>('completo')
  const [savingGrupo, setSavingGrupo] = useState(false)

  const gruposNormales = grupos.filter(g => !g.es_elite)

  async function asignarGrupo(alumna: Alumna) {
    if (!grupoSelId) return
    setSavingGrupo(true)
    const res = await fetch('/api/escuela/grupos/alumnas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alumna_id: alumna.id, grupo_id: grupoSelId, tipo_asistencia: tipoAsistSel }),
    })
    if (res.ok) {
      const grupo = grupos.find(g => g.id === grupoSelId)!
      const actualizada = {
        ...alumna,
        alumna_grupo: [
          ...alumna.alumna_grupo.map(ag => ag.grupos.es_elite ? ag : { ...ag, activo: false }),
          { activo: true, grupos: grupo },
        ],
      }
      setLista(prev => prev.map(x => x.id === alumna.id ? actualizada : x))
      setSeleccionada(actualizada)
      setAsignandoGrupo(false)
      setGrupoSelId('')
      setTipoAsistSel('completo')
    }
    setSavingGrupo(false)
  }

  const gruposElite = grupos.filter(g => g.es_elite)

  async function toggleGrupoElite(alumna: Alumna, grupo: Grupo) {
    setTogglingGrupoElite(grupo.id)
    const tiene = alumna.alumna_grupo.some(ag => ag.activo && ag.grupos.id === grupo.id)
    try {
      if (tiene) {
        await fetch(`/api/escuela/grupos/alumnas?alumna_id=${alumna.id}&grupo_id=${grupo.id}`, { method: 'DELETE' })
        const actualizada = { ...alumna, alumna_grupo: alumna.alumna_grupo.map(ag => ag.grupos.id === grupo.id ? { ...ag, activo: false } : ag) }
        setLista(prev => prev.map(x => x.id === alumna.id ? actualizada : x))
        setSeleccionada(actualizada)
      } else {
        await fetch('/api/escuela/grupos/alumnas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alumna_id: alumna.id, grupo_id: grupo.id }),
        })
        const actualizada = { ...alumna, alumna_grupo: [...alumna.alumna_grupo, { activo: true, grupos: grupo }] }
        setLista(prev => prev.map(x => x.id === alumna.id ? actualizada : x))
        setSeleccionada(actualizada)
      }
    } finally {
      setTogglingGrupoElite(null)
    }
  }

  async function toggleActividad(alumna: Alumna, actividad: Actividad) {
    setTogglingActividad(actividad.id)
    const tieneActividad = alumna.alumna_actividad.some(aa => aa.actividades_extra.id === actividad.id)
    try {
      if (tieneActividad) {
        await fetch('/api/escuela/alumnas/actividades', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alumna_id: alumna.id, actividad_id: actividad.id }),
        })
        const actualizada = { ...alumna, alumna_actividad: alumna.alumna_actividad.filter(aa => aa.actividades_extra.id !== actividad.id) }
        setLista(prev => prev.map(x => x.id === alumna.id ? actualizada : x))
        setSeleccionada(actualizada)
      } else {
        const ta = tipoAsistAct[actividad.id] ?? 'completo'
        await fetch('/api/escuela/alumnas/actividades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alumna_id: alumna.id, actividad_id: actividad.id, tipo_asistencia: ta }),
        })
        const actualizada = { ...alumna, alumna_actividad: [...alumna.alumna_actividad, { actividades_extra: actividad, tipo_asistencia: ta }] }
        setLista(prev => prev.map(x => x.id === alumna.id ? actualizada : x))
        setSeleccionada(actualizada)
      }
    } finally {
      setTogglingActividad(null)
    }
  }

  // Modal nueva alumna
  const [modalCrear, setModalCrear] = useState(false)
  const [formCrear, setFormCrear] = useState({ nombre: '', familia_id: '', grupo_id: '', fecha_nacimiento: '', documento: '', notas: '' })
  const [creando, setCreando] = useState(false)
  const [errorCrear, setErrorCrear] = useState('')
  const [busquedaFamilia, setBusquedaFamilia] = useState('')

  const [listaFamilias, setListaFamilias] = useState(familias)
  const familiasFiltradas = listaFamilias.filter(f => f.nombre.toLowerCase().includes(busquedaFamilia.toLowerCase()))

  async function crearFamiliaYSeleccionar() {
    const nombre = busquedaFamilia.trim()
    if (!nombre) return
    setCreando(true)
    const res = await fetch('/api/escuela/familias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre }),
    })
    const data = await res.json()
    setCreando(false)
    if (!res.ok) { setErrorCrear(data.error ?? 'Error al crear familia'); return }
    const nueva: Familia = { id: data.id, nombre: data.nombre }
    setListaFamilias(prev => [...prev, nueva].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    setFormCrear(f => ({ ...f, familia_id: data.id }))
    setBusquedaFamilia(data.nombre)
    setErrorCrear('')
  }

  async function crearAlumna(e: React.FormEvent) {
    e.preventDefault()
    if (!formCrear.nombre.trim()) { setErrorCrear('El nombre es obligatorio'); return }
    setCreando(true); setErrorCrear('')
    const res = await fetch('/api/escuela/alumnas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: formCrear.nombre.trim(),
        familia_id: formCrear.familia_id,
        grupo_id: formCrear.grupo_id || null,
        fecha_nacimiento: formCrear.fecha_nacimiento || null,
        documento: formCrear.documento || null,
        notas: formCrear.notas || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setErrorCrear(data.error ?? 'Error al crear'); setCreando(false); return }
    const a = data.alumna ?? data
    const nuevaAlumna: Alumna = {
      id: a.id,
      nombre: a.nombre,
      fecha_nacimiento: a.fecha_nacimiento,
      activa: a.activa ?? true,
      congelada: a.congelada ?? false,
      codigo_vinculacion: a.codigo_vinculacion,
      descuento_mensual: null,
      familias: familias.find(f => f.id === formCrear.familia_id) ? { id: formCrear.familia_id, nombre: familias.find(f => f.id === formCrear.familia_id)!.nombre, email: '', telefono: null } : null,
      alumna_grupo: (a.alumna_grupo ?? []).map((ag: any) => ({ activo: ag.activo, tipo_asistencia: ag.tipo_asistencia, grupos: ag.grupos })),
      alumna_actividad: [],
    }
    setLista(prev => [...prev, nuevaAlumna].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    setModalCrear(false)
    setFormCrear({ nombre: '', familia_id: '', grupo_id: '', fecha_nacimiento: '', documento: '', notas: '' })
    setBusquedaFamilia('')
    setCreando(false)
  }

  async function guardarDescuento(a: Alumna) {
    setSavingDescuento(true)
    try {
      const valor = descuentoInput === '' ? null : Number(descuentoInput)
      const res = await fetch('/api/escuela/alumnas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: a.id, descuento_mensual: valor }),
      })
      if (!res.ok) { alert((await res.json()).error ?? 'Error'); return }
      const actualizada = { ...a, descuento_mensual: valor }
      setLista(prev => prev.map(x => x.id === a.id ? actualizada : x))
      setSeleccionada(actualizada)
      setEditandoDescuento(false)
    } finally {
      setSavingDescuento(false)
    }
  }

  async function toggleActiva(a: Alumna) {
    setToggling(true)
    try {
      const res = await fetch('/api/escuela/alumnas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: a.id, activa: !a.activa }),
      })
      if (!res.ok) { alert((await res.json()).error ?? 'Error'); return }
      const actualizada = { ...a, activa: !a.activa }
      setLista(prev => prev.map(x => x.id === a.id ? actualizada : x))
      setSeleccionada(actualizada)
    } finally {
      setToggling(false)
    }
  }

  async function eliminarAlumna(a: Alumna) {
    if (!confirm(`¿Eliminar a ${a.nombre}? Esta acción no se puede deshacer.`)) return
    setEliminando(true)
    try {
      const res = await fetch(`/api/escuela/alumnas?id=${a.id}`, { method: 'DELETE' })
      if (!res.ok) { alert((await res.json()).error ?? 'Error al eliminar'); return }
      setLista(prev => prev.filter(x => x.id !== a.id))
      setSeleccionada(null)
    } finally {
      setEliminando(false)
    }
  }

  const filtradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim()
    return lista.filter(a => {
      if (q) {
        const enNombre = a.nombre.toLowerCase().includes(q)
        const enFamilia = a.familias?.nombre.toLowerCase().includes(q) ?? false
        const enGrupo = gruposActivos(a).some(g => g.nombre.toLowerCase().includes(q))
        const enCodigo = a.codigo_vinculacion?.toLowerCase().includes(q) ?? false
        if (!enNombre && !enFamilia && !enGrupo && !enCodigo) return false
      }
      if (filtroGrupo) {
        const tieneGrupo = gruposActivos(a).some(g => g.id === filtroGrupo)
        const tieneActividad = a.alumna_actividad.some(aa => aa.actividades_extra.id === filtroGrupo)
        if (!tieneGrupo && !tieneActividad) return false
      }
      if (filtroEstado === 'activas' && (!a.activa || a.congelada)) return false
      if (filtroEstado === 'sin_familia' && a.familias !== null) return false
      return true
    })
  }, [alumnas, busqueda, filtroGrupo, filtroEstado])

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const paginaActual = Math.min(pagina, totalPaginas)
  const visibles = filtradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA)

  function cambiarFiltro(fn: () => void) { fn(); setPagina(1) }

  function copiarCodigo(codigo: string) {
    navigator.clipboard.writeText(codigo)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }

  return (
    <>
    <div className="flex gap-6 h-full">
      {/* Lista */}
      <div className={`flex flex-col min-w-0 transition-all ${seleccionada ? 'w-[55%]' : 'w-full'}`}>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Alumnas</h1>
            <p className="text-white/40 text-sm">{lista.length} registradas · {filtradas.length} mostradas</p>
          </div>
          <button onClick={() => setModalCrear(true)}
            className="shrink-0 bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Nueva alumna
          </button>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <input
            value={busqueda}
            onChange={e => cambiarFiltro(() => setBusqueda(e.target.value))}
            placeholder="Buscar por nombre, familia, grupo o código..."
            className="flex-1 min-w-[200px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]"
          />
          <select
            value={filtroGrupo}
            onChange={e => cambiarFiltro(() => setFiltroGrupo(e.target.value))}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]">
            <option value="">Todos los grupos</option>
            {grupos.map(g => (
              <option key={g.id} value={g.id}>{g.nombre}{g.es_elite ? ' ⭐' : ''}</option>
            ))}
          </select>
          <select
            value={filtroEstado}
            onChange={e => cambiarFiltro(() => setFiltroEstado(e.target.value as any))}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]">
            <option value="todas">Todas</option>
            <option value="activas">Activas</option>
            <option value="sin_familia">Sin familia</option>
          </select>
        </div>

        {/* Tabla */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Alumna</th>
                <th className="text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Grupo</th>
                <th className="text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Familia</th>
                <th className="text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-white/30">Sin resultados</td></tr>
              ) : visibles.map(a => {
                const gas = gruposActivos(a)
                const acts = a.alumna_actividad
                const isSelected = seleccionada?.id === a.id
                return (
                  <tr
                    key={a.id}
                    onClick={() => setSeleccionada(isSelected ? null : a)}
                    className={`border-b border-white/5 cursor-pointer transition-colors ${isSelected ? 'bg-[#e91e8c]/10' : 'hover:bg-white/5'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#e91e8c]/20 flex items-center justify-center text-[#e91e8c] font-bold text-xs shrink-0">
                          {a.nombre.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-medium leading-tight">{a.nombre}</p>
                          {a.fecha_nacimiento && (
                            <p className="text-white/30 text-xs">{calcularEdad(a.fecha_nacimiento)} años</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {gas.map(g => {
                          const ag = a.alumna_grupo.find(ag => ag.activo && ag.grupos.id === g.id)
                          const ta = ag?.tipo_asistencia
                          return (
                            <span key={g.id} className="text-xs bg-white/10 text-white/70 px-1.5 py-0.5 rounded flex items-center gap-1">
                              {g.nombre}{g.es_elite ? ' ⭐' : ''}
                              {ta === 'media' && <span className="text-white/40">½</span>}
                              {ta === 'cuarto' && <span className="text-white/40">¼</span>}
                            </span>
                          )
                        })}
                        {acts.map(aa => {
                          const ta = (aa as any).tipo_asistencia
                          return (
                            <span key={aa.actividades_extra.id} className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                              {aa.actividades_extra.nombre}
                              {ta === 'media' && <span className="text-purple-400/60">½</span>}
                              {ta === 'cuarto' && <span className="text-purple-400/60">¼</span>}
                            </span>
                          )
                        })}
                        {gas.length === 0 && acts.length === 0 && (
                          <span className="text-xs text-white/20">Sin grupo</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {a.familias ? (
                        <p className="text-white/60 text-xs truncate max-w-[140px]">{a.familias.nombre}</p>
                      ) : (
                        <span className="text-xs text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">Sin familia</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {a.congelada
                        ? <span className="text-xs text-blue-400">❄ Congelada</span>
                        : a.activa
                          ? <span className="text-xs text-green-400">Activa</span>
                          : <span className="text-xs text-white/30">Inactiva</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-white/30 text-xs">
              {(paginaActual - 1) * POR_PAGINA + 1}–{Math.min(paginaActual * POR_PAGINA, filtradas.length)} de {filtradas.length}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-white rounded-lg disabled:opacity-30 transition-colors">
                ← Anterior
              </button>
              {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPaginas - 4, paginaActual - 2)) + i
                return (
                  <button key={p} onClick={() => setPagina(p)}
                    className={`w-8 h-8 text-xs rounded-lg transition-colors ${p === paginaActual ? 'bg-[#e91e8c] text-white' : 'bg-white/5 hover:bg-white/10 text-white/60'}`}>
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual === totalPaginas}
                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-white rounded-lg disabled:opacity-30 transition-colors">
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Panel detalle */}
      {seleccionada && (
        <div className="w-[45%] shrink-0">
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 sticky top-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#e91e8c]/20 flex items-center justify-center text-[#e91e8c] font-bold text-lg">
                  {seleccionada.nombre.charAt(0)}
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg leading-tight">{seleccionada.nombre}</h2>
                  {seleccionada.fecha_nacimiento && (
                    <p className="text-white/40 text-sm">{calcularEdad(seleccionada.fecha_nacimiento)} años · {new Date(seleccionada.fecha_nacimiento + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActiva(seleccionada)}
                  disabled={toggling}
                  className={`text-xs px-2 py-1 rounded-lg transition-colors disabled:opacity-40 ${seleccionada.activa ? 'text-yellow-400 hover:bg-yellow-400/10' : 'text-green-400 hover:bg-green-400/10'}`}>
                  {seleccionada.activa ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => eliminarAlumna(seleccionada)}
                  disabled={eliminando}
                  className="text-xs text-red-400 hover:text-white hover:bg-red-500/20 px-2 py-1 rounded-lg transition-colors disabled:opacity-40">
                  Eliminar
                </button>
                <button onClick={() => setSeleccionada(null)} className="text-white/30 hover:text-white text-xl leading-none">×</button>
              </div>
            </div>

            {/* Estado */}
            <div className="flex gap-2 mb-5">
              {seleccionada.congelada && <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-lg">❄ Congelada</span>}
              {!seleccionada.activa && <span className="text-xs text-white/30 bg-white/5 px-2 py-1 rounded-lg">Inactiva</span>}
              {seleccionada.activa && !seleccionada.congelada && <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-lg">Activa</span>}
            </div>

            {/* Grupos normales */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/40 uppercase tracking-wider">Grupo</p>
                <button onClick={() => { setAsignandoGrupo(a => !a); setGrupoSelId(''); setTipoAsistSel('completo') }}
                  className="text-xs text-white/40 hover:text-white transition-colors">
                  {asignandoGrupo ? 'Cancelar' : 'Cambiar'}
                </button>
              </div>

              {/* Grupo actual */}
              {!asignandoGrupo && (() => {
                const ga = gruposActivos(seleccionada).filter(g => !g.es_elite)
                return ga.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {ga.map(g => {
                      const ag = seleccionada.alumna_grupo.find(ag => ag.activo && ag.grupos.id === g.id) as any
                      const ta = ag?.tipo_asistencia
                      return (
                        <span key={g.id} className="text-sm bg-white/10 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                          {g.nombre}
                          {ta === 'media' && <span className="text-xs text-white/50 bg-white/10 px-1.5 py-0.5 rounded">½</span>}
                          {ta === 'cuarto' && <span className="text-xs text-white/50 bg-white/10 px-1.5 py-0.5 rounded">¼</span>}
                        </span>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-white/20">Sin grupo asignado</p>
                )
              })()}

              {/* Selector de grupo */}
              {asignandoGrupo && (
                <div className="space-y-2">
                  <select value={grupoSelId} onChange={e => setGrupoSelId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]">
                    <option value="">Seleccionar grupo...</option>
                    {gruposNormales.map(g => (
                      <option key={g.id} value={g.id}>{g.nombre}</option>
                    ))}
                  </select>
                  {grupoSelId && (() => {
                    const g = grupos.find(x => x.id === grupoSelId)
                    const tieneOpciones = g?.precio_media != null || g?.precio_cuarto != null
                    return tieneOpciones ? (
                      <div className="flex gap-2">
                        <button onClick={() => setTipoAsistSel('completo')}
                          className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${tipoAsistSel === 'completo' ? 'bg-[#e91e8c]/20 border-[#e91e8c]/40 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:text-white'}`}>
                          Completo
                        </button>
                        {g?.precio_media != null && (
                          <button onClick={() => setTipoAsistSel('media')}
                            className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${tipoAsistSel === 'media' ? 'bg-[#e91e8c]/20 border-[#e91e8c]/40 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:text-white'}`}>
                            ½ asistencia
                          </button>
                        )}
                        {g?.precio_cuarto != null && (
                          <button onClick={() => setTipoAsistSel('cuarto')}
                            className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${tipoAsistSel === 'cuarto' ? 'bg-[#e91e8c]/20 border-[#e91e8c]/40 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:text-white'}`}>
                            ¼ asistencia
                          </button>
                        )}
                      </div>
                    ) : null
                  })()}
                  <button onClick={() => asignarGrupo(seleccionada)} disabled={!grupoSelId || savingGrupo}
                    className="w-full bg-[#e91e8c] hover:bg-[#ff3da8] disabled:opacity-40 text-white text-xs font-medium py-2 rounded-lg transition-colors">
                    {savingGrupo ? 'Guardando...' : 'Asignar grupo'}
                  </button>
                </div>
              )}
            </div>

            {/* Grupos élite */}
            {gruposElite.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Grupos élite</p>
                <div className="flex flex-wrap gap-2">
                  {gruposElite.map(g => {
                    const tiene = seleccionada.alumna_grupo.some(ag => ag.activo && ag.grupos.id === g.id)
                    return (
                      <button key={g.id} type="button"
                        onClick={() => toggleGrupoElite(seleccionada, g)}
                        disabled={togglingGrupoElite === g.id}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
                          tiene
                            ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'
                            : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/30'
                        }`}>
                        {tiene ? '⭐ ' : '+ '}{g.nombre}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Actividades extra */}
            {actividades.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Actividades extra</p>
                <div className="flex flex-wrap gap-2">
                  {actividades.map(act => {
                    const tiene = seleccionada.alumna_actividad.some(aa => aa.actividades_extra.id === act.id)
                    const taActual = (seleccionada.alumna_actividad.find(aa => aa.actividades_extra.id === act.id) as any)?.tipo_asistencia
                    const tieneOpciones = !tiene && (act.precio_media != null || act.precio_cuarto != null)
                    return (
                      <div key={act.id} className="flex items-center gap-1">
                        <button type="button"
                          onClick={() => toggleActividad(seleccionada, act)}
                          disabled={togglingActividad === act.id}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
                            tiene
                              ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                              : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/30'
                          }`}>
                          {tiene ? '✓ ' : '+ '}{act.nombre}
                          {!act.es_recurrente ? ' · único' : ''}
                          {tiene && taActual && taActual !== 'completo' && ` ${taActual === 'media' ? '½' : '¼'}`}
                        </button>
                        {tieneOpciones && (
                          <select
                            value={tipoAsistAct[act.id] ?? 'completo'}
                            onChange={e => setTipoAsistAct(prev => ({ ...prev, [act.id]: e.target.value as any }))}
                            className="text-xs bg-white/5 border border-white/10 rounded-lg px-1.5 py-1 text-white/50 focus:outline-none focus:border-purple-500">
                            <option value="completo">Completo</option>
                            {act.precio_media != null && <option value="media">½</option>}
                            {act.precio_cuarto != null && <option value="cuarto">¼</option>}
                          </select>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Familia */}
            <div className="mb-4">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Familia</p>
              {seleccionada.familias ? (
                <div className="bg-white/5 rounded-lg p-3 space-y-1">
                  <p className="text-white font-medium">{seleccionada.familias.nombre}</p>
                  <p className="text-white/50 text-sm">{seleccionada.familias.email}</p>
                  {seleccionada.familias.telefono && (
                    <p className="text-white/50 text-sm">{seleccionada.familias.telefono}</p>
                  )}
                  <Link href={`/escuela/familias/${seleccionada.familias.id}`}
                    className="inline-block mt-1 text-xs text-[#e91e8c] hover:underline">
                    Ver familia →
                  </Link>
                </div>
              ) : (
                <div className="bg-amber-400/5 border border-amber-400/20 rounded-lg p-3">
                  <p className="text-amber-400 text-sm font-medium">Sin familia vinculada</p>
                  <p className="text-white/40 text-xs mt-0.5">La familia debe registrarse con el código de vinculación</p>
                </div>
              )}
            </div>

            {/* Descuento mensual */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/40 uppercase tracking-wider">Descuento mensual</p>
                {!editandoDescuento && (
                  <button
                    onClick={() => { setDescuentoInput(seleccionada.descuento_mensual ? String(seleccionada.descuento_mensual) : ''); setEditandoDescuento(true) }}
                    className="text-xs text-white/40 hover:text-white transition-colors">
                    Editar
                  </button>
                )}
              </div>
              {editandoDescuento ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 flex-1 bg-white/5 border border-white/15 rounded-lg px-3 py-2">
                    <span className="text-white/40 text-sm">$</span>
                    <input
                      type="number" min="0" step="1000" autoFocus
                      value={descuentoInput}
                      onChange={e => setDescuentoInput(e.target.value)}
                      placeholder="0"
                      className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-white/20"
                    />
                  </div>
                  <button onClick={() => guardarDescuento(seleccionada)} disabled={savingDescuento}
                    className="text-xs bg-[#e91e8c] hover:bg-[#ff3da8] text-white px-3 py-2 rounded-lg disabled:opacity-50 transition-colors">
                    {savingDescuento ? '...' : 'OK'}
                  </button>
                  <button onClick={() => setEditandoDescuento(false)}
                    className="text-xs text-white/40 hover:text-white px-2 py-2 rounded-lg transition-colors">
                    ✕
                  </button>
                </div>
              ) : (
                <div className="bg-white/5 rounded-lg px-4 py-3">
                  {seleccionada.descuento_mensual ? (
                    <span className="text-green-400 font-semibold">-${Number(seleccionada.descuento_mensual).toLocaleString('es-CO')}</span>
                  ) : (
                    <span className="text-white/30 text-sm">Sin descuento</span>
                  )}
                </div>
              )}
            </div>

            {/* Código de vinculación */}
            {seleccionada.codigo_vinculacion && (
              <div className="mb-4">
                <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Código de vinculación</p>
                <div className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-3">
                  <span className="font-mono font-bold text-[#e91e8c] text-lg tracking-widest flex-1">
                    {seleccionada.codigo_vinculacion}
                  </span>
                  <button
                    onClick={() => copiarCodigo(seleccionada.codigo_vinculacion!)}
                    className="text-xs text-white/50 hover:text-white transition-colors bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg">
                    {copiado ? '✓ Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="text-white/30 text-xs mt-1.5">
                  La familia usa este código en{' '}
                  <span className="text-white/50">softdance.grialtech.co/registro</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    {/* Modal nueva alumna */}
    {modalCrear && (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-md">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10">
            <h2 className="text-white font-semibold">Nueva alumna</h2>
            <button onClick={() => { setModalCrear(false); setErrorCrear('') }} className="text-white/30 hover:text-white text-xl leading-none">×</button>
          </div>
          <form onSubmit={crearAlumna} className="p-6 space-y-4">
            <div>
              <label className="block text-xs text-white/50 mb-1">Nombre *</label>
              <input value={formCrear.nombre} onChange={e => setFormCrear({ ...formCrear, nombre: e.target.value })}
                placeholder="Nombre completo"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1">Familia <span className="text-white/30">(opcional)</span></label>
              <input value={busquedaFamilia} onChange={e => { setBusquedaFamilia(e.target.value); setFormCrear({ ...formCrear, familia_id: '' }) }}
                placeholder="Buscar familia..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c] mb-1" />
              {busquedaFamilia && !formCrear.familia_id && (
                <div className="bg-[#0f0f1e] border border-white/10 rounded-lg max-h-40 overflow-y-auto">
                  {familiasFiltradas.slice(0, 8).map(f => (
                    <button key={f.id} type="button"
                      onClick={() => { setFormCrear({ ...formCrear, familia_id: f.id }); setBusquedaFamilia(f.nombre) }}
                      className="w-full text-left px-3 py-2 text-sm text-white/80 hover:bg-white/5 transition-colors">
                      {f.nombre}
                    </button>
                  ))}
                  {!familiasFiltradas.some(f => f.nombre.toLowerCase() === busquedaFamilia.toLowerCase()) && (
                    <button type="button" onClick={crearFamiliaYSeleccionar}
                      className="w-full text-left px-3 py-2 text-sm text-[#e91e8c] hover:bg-white/5 transition-colors border-t border-white/5">
                      + Crear familia "{busquedaFamilia}"
                    </button>
                  )}
                </div>
              )}
              {formCrear.familia_id && (
                <p className="text-xs text-green-400 mt-1">✓ {busquedaFamilia}</p>
              )}
            </div>

            <div>
              <label className="block text-xs text-white/50 mb-1">Grupo</label>
              <select value={formCrear.grupo_id} onChange={e => setFormCrear({ ...formCrear, grupo_id: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]">
                <option value="">Sin grupo</option>
                {grupos.filter(g => !g.es_elite).map(g => (
                  <option key={g.id} value={g.id}>{g.nombre}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/50 mb-1">Fecha de nacimiento</label>
                <input type="date" value={formCrear.fecha_nacimiento} onChange={e => setFormCrear({ ...formCrear, fecha_nacimiento: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Documento</label>
                <input value={formCrear.documento} onChange={e => setFormCrear({ ...formCrear, documento: e.target.value })}
                  placeholder="CC / TI"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
              </div>
            </div>

            {errorCrear && <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{errorCrear}</p>}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => { setModalCrear(false); setErrorCrear('') }}
                className="flex-1 border border-white/10 text-white/60 hover:text-white text-sm py-2 rounded-lg transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={creando}
                className="flex-1 bg-[#e91e8c] hover:bg-[#ff3da8] disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors">
                {creando ? 'Creando...' : 'Crear alumna'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  )
}
