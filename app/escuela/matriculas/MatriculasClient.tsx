'use client'

import { useState } from 'react'

type Familia = { id: string; nombre: string; email: string }
type Matricula = {
  id: string; familia_id: string; anio: number; valor: number; estado: string; created_at: string
  familias: { nombre: string; email: string }
}

export default function MatriculasClient({ matriculasIniciales, familias, valorDefault, anioActual }: {
  matriculasIniciales: Matricula[]
  familias: Familia[]
  valorDefault: number
  anioActual: number
}) {
  const [matriculas, setMatriculas] = useState(matriculasIniciales)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ familia_id: '', anio: anioActual, valor: valorDefault })
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [anioFiltro, setAnioFiltro] = useState(anioActual)

  const anios = [...new Set([anioActual, ...matriculas.map(m => m.anio)])].sort((a, b) => b - a)
  const filtradas = matriculas.filter(m => m.anio === anioFiltro)
  const pendientes = filtradas.filter(m => m.estado === 'pendiente').length
  const pagadas = filtradas.filter(m => m.estado === 'pagado').length
  const total = filtradas.reduce((s, m) => s + m.valor, 0)
  const cobrado = filtradas.filter(m => m.estado === 'pagado').reduce((s, m) => s + m.valor, 0)

  async function generarTodas() {
    setSaving(true)
    const familiasSinMatricula = familias.filter(f =>
      !matriculas.some(m => m.familia_id === f.id && m.anio === anioFiltro)
    )
    const nuevas: Matricula[] = []
    for (const f of familiasSinMatricula) {
      const res = await fetch('/api/escuela/matriculas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familia_id: f.id, anio: anioFiltro, valor: valorDefault }),
      })
      const data = await res.json()
      if (res.ok) nuevas.push(data.matricula)
    }
    setMatriculas(prev => [...nuevas, ...prev])
    setSaving(false)
  }

  async function crearUna(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/escuela/matriculas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (res.ok) {
      setMatriculas(prev => {
        const sin = prev.filter(m => !(m.familia_id === data.matricula.familia_id && m.anio === data.matricula.anio))
        return [data.matricula, ...sin]
      })
      setShowForm(false)
    }
    setSaving(false)
  }

  async function toggleEstado(m: Matricula) {
    setUpdatingId(m.id)
    const nuevoEstado = m.estado === 'pagado' ? 'pendiente' : 'pagado'
    const res = await fetch('/api/escuela/matriculas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: m.id, estado: nuevoEstado }),
    })
    const data = await res.json()
    if (res.ok) setMatriculas(matriculas.map(x => x.id === m.id ? data.matricula : x))
    setUpdatingId(null)
  }

  const familiasSinMatricula = familias.filter(f =>
    !matriculas.some(m => m.familia_id === f.id && m.anio === anioFiltro)
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Matrículas</h1>
          <p className="text-white/40 text-sm mt-0.5">Cobro anual de matrícula</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(true)}
            className="border border-white/10 text-white/70 hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors hover:bg-white/5">
            + Individual
          </button>
          {familiasSinMatricula.length > 0 && (
            <button onClick={generarTodas} disabled={saving}
              className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
              {saving ? 'Generando...' : `Generar todas (${familiasSinMatricula.length})`}
            </button>
          )}
        </div>
      </div>

      {/* Año filtro */}
      <div className="flex items-center gap-3 mb-5">
        <select value={anioFiltro} onChange={e => setAnioFiltro(parseInt(e.target.value))}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]">
          {anios.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <p className="text-white/40 text-sm">
          {filtradas.length} familias · ${cobrado.toLocaleString('es-CO')} de ${total.toLocaleString('es-CO')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Pendientes', value: pendientes, color: 'text-yellow-400' },
          { label: 'Pagadas', value: pagadas, color: 'text-green-400' },
          { label: 'Total año', value: `$${total.toLocaleString('es-CO')}`, color: 'text-white' },
        ].map(s => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-white/40 text-xs mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Modal individual */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-white mb-4">Registrar matrícula</h2>
            <form onSubmit={crearUna} className="space-y-3">
              <div>
                <label className="block text-xs text-white/50 mb-1">Familia</label>
                <select required value={form.familia_id} onChange={e => setForm({ ...form, familia_id: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]">
                  <option value="">Seleccionar...</option>
                  {familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Año</label>
                <input type="number" value={form.anio} onChange={e => setForm({ ...form, anio: parseInt(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Valor ($)</label>
                <input type="number" value={form.valor} onChange={e => setForm({ ...form, valor: parseInt(e.target.value) })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-white/10 text-white/60 text-sm py-2 rounded-lg hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm py-2 rounded-lg disabled:opacity-50 transition-colors">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista */}
      {filtradas.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
          <p className="text-white/30 text-sm">No hay matrículas para {anioFiltro}</p>
          {familias.length > 0 && (
            <p className="text-white/20 text-xs mt-2">Haz clic en "Generar todas" para crearlas automáticamente</p>
          )}
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Familia</th>
                <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Valor</th>
                <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((m, i) => (
                <tr key={m.id} className={`${i < filtradas.length - 1 ? 'border-b border-white/5' : ''} hover:bg-white/5 transition-colors`}>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{m.familias.nombre}</p>
                    <p className="text-white/40 text-xs">{m.familias.email}</p>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">
                    ${Number(m.valor).toLocaleString('es-CO')}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.estado === 'pagado' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                      {m.estado === 'pagado' ? 'Pagada' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toggleEstado(m)} disabled={updatingId === m.id}
                      className={`text-xs px-3 py-1 rounded-lg transition-colors disabled:opacity-50 ${m.estado === 'pagado' ? 'bg-white/5 text-white/40 hover:bg-white/10' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>
                      {updatingId === m.id ? '...' : m.estado === 'pagado' ? 'Revertir' : 'Marcar pagada'}
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
