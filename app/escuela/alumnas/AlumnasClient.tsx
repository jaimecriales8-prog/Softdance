'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

type Grupo = { id: string; nombre: string; es_elite: boolean }
type Alumna = {
  id: string
  nombre: string
  fecha_nacimiento: string | null
  activa: boolean
  congelada: boolean
  codigo_vinculacion: string | null
  familias: { id: string; nombre: string; email: string; telefono: string | null } | null
  alumna_grupo: { activo: boolean; grupos: Grupo }[]
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

export default function AlumnasClient({ alumnas, grupos }: { alumnas: Alumna[]; grupos: Grupo[] }) {
  const [busqueda, setBusqueda] = useState('')
  const [filtroGrupo, setFiltroGrupo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'todas' | 'activas' | 'sin_familia'>('todas')
  const [pagina, setPagina] = useState(1)
  const [seleccionada, setSeleccionada] = useState<Alumna | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [lista, setLista] = useState(alumnas)
  const [eliminando, setEliminando] = useState(false)
  const [toggling, setToggling] = useState(false)

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
    <div className="flex gap-6 h-full">
      {/* Lista */}
      <div className={`flex flex-col min-w-0 transition-all ${seleccionada ? 'w-[55%]' : 'w-full'}`}>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Alumnas</h1>
          <p className="text-white/40 text-sm">{alumnas.length} registradas · {filtradas.length} mostradas</p>
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
                        {gas.map(g => (
                          <span key={g.id} className="text-xs bg-white/10 text-white/70 px-1.5 py-0.5 rounded">
                            {g.nombre}{g.es_elite ? ' ⭐' : ''}
                          </span>
                        ))}
                        {acts.map(aa => (
                          <span key={aa.actividades_extra.id} className="text-xs bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                            {aa.actividades_extra.nombre}
                          </span>
                        ))}
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

            {/* Grupos */}
            <div className="mb-4">
              <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Grupos</p>
              <div className="flex flex-wrap gap-2">
                {gruposActivos(seleccionada).map(g => (
                  <span key={g.id} className="text-sm bg-white/10 text-white px-3 py-1 rounded-lg">
                    {g.nombre}{g.es_elite ? ' ⭐' : ''}
                  </span>
                ))}
                {seleccionada.alumna_actividad.map(aa => (
                  <span key={aa.actividades_extra.id} className="text-sm bg-purple-500/20 text-purple-300 px-3 py-1 rounded-lg">
                    {aa.actividades_extra.nombre}
                  </span>
                ))}
                {gruposActivos(seleccionada).length === 0 && seleccionada.alumna_actividad.length === 0 && (
                  <span className="text-sm text-white/20">Sin grupo asignado</span>
                )}
              </div>
            </div>

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
  )
}
