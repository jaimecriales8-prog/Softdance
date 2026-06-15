'use client'

import { useState } from 'react'
import Link from 'next/link'

type Alumna = { id: string; nombre: string; activa: boolean }
type Familia = {
  id: string; nombre: string; email: string
  telefono: string | null; activa: boolean; created_at: string
  alumnas: Alumna[]
}

const EMPTY = { nombre: '', email: '', telefono: '', password: '' }

export default function FamiliasClient({ familias: inicial, escuelaId }: { familias: Familia[]; escuelaId: string }) {
  const [familias, setFamilias] = useState(inicial)
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState<'crear' | 'editar' | 'reset' | null>(null)
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetFamilia, setResetFamilia] = useState<Familia | null>(null)

  function abrirCrear() { setForm(EMPTY); setEditId(null); setError(''); setModal('crear') }
  function abrirEditar(f: Familia) {
    setForm({ nombre: f.nombre, email: f.email, telefono: f.telefono ?? '', password: '' })
    setEditId(f.id); setError(''); setModal('editar')
  }
  function abrirReset(f: Familia) { setResetFamilia(f); setResetPassword(''); setError(''); setModal('reset') }
  function cerrar() { setModal(null); setEditId(null); setForm(EMPTY); setError(''); setResetFamilia(null) }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/escuela/familias', {
      method: modal === 'crear' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, escuela_id: escuelaId, id: editId }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error al guardar') } else {
      if (modal === 'crear') setFamilias([{ ...data.familia, alumnas: [] }, ...familias])
      else setFamilias(familias.map(f => f.id === editId ? { ...f, ...data.familia } : f))
      cerrar()
    }
    setLoading(false)
  }

  async function guardarReset(e: React.FormEvent) {
    e.preventDefault()
    if (!resetFamilia || !resetPassword) return
    setLoading(true); setError('')
    const res = await fetch('/api/escuela/familias/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ familia_id: resetFamilia.id, password: resetPassword }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Error al cambiar contraseña') } else cerrar()
    setLoading(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Familias</h1>
          <p className="text-white/40 text-sm mt-0.5">{familias.length} familias registradas</p>
        </div>
        <button onClick={abrirCrear}
          className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Nueva familia
        </button>
      </div>

      {/* Modal crear / editar */}
      {(modal === 'crear' || modal === 'editar') && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-4">
              {modal === 'crear' ? 'Nueva familia' : 'Editar familia'}
            </h2>
            <form onSubmit={guardar} className="space-y-3">
              <div>
                <label className="block text-xs text-white/50 mb-1">Nombre de la familia *</label>
                <input required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Familia García"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Correo *</label>
                <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">Teléfono</label>
                <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })}
                  placeholder="300 000 0000"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
              </div>
              {modal === 'crear' && (
                <div>
                  <label className="block text-xs text-white/50 mb-1">Contraseña temporal *</label>
                  <input required type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
                  <p className="text-xs text-white/30 mt-1">Comparte esta clave con los padres para que ingresen al portal.</p>
                </div>
              )}
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={cerrar}
                  className="flex-1 border border-white/10 text-white/60 text-sm py-2 rounded-lg hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm py-2 rounded-lg disabled:opacity-50 transition-colors">
                  {loading ? 'Guardando...' : modal === 'crear' ? 'Crear familia' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal reset contraseña */}
      {modal === 'reset' && resetFamilia && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-1">Cambiar contraseña</h2>
            <p className="text-white/40 text-xs mb-4">{resetFamilia.nombre} · {resetFamilia.email}</p>
            <form onSubmit={guardarReset} className="space-y-3">
              <div>
                <label className="block text-xs text-white/50 mb-1">Nueva contraseña *</label>
                <input required type="text" value={resetPassword} onChange={e => setResetPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]" />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={cerrar}
                  className="flex-1 border border-white/10 text-white/60 text-sm py-2 rounded-lg hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm py-2 rounded-lg disabled:opacity-50 transition-colors">
                  {loading ? 'Cambiando...' : 'Cambiar contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Buscador */}
      {familias.length > 0 && (
        <div className="mb-4">
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar familia por nombre o correo…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#e91e8c]"
          />
        </div>
      )}

      {/* Lista */}
      {familias.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-12 text-center text-white/30 text-sm">
          No hay familias registradas aún
        </div>
      ) : (
        <div className="grid gap-3">
          {familias.filter(f => {
            const q = busqueda.toLowerCase()
            return !q || f.nombre.toLowerCase().includes(q) || f.email.toLowerCase().includes(q)
          }).map(f => (
            <div key={f.id} className="bg-white/5 border border-white/10 rounded-xl px-5 py-4 flex items-center justify-between hover:bg-white/[0.07] transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-[#e91e8c]/20 flex items-center justify-center text-[#e91e8c] font-bold text-sm">
                  {f.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-medium">{f.nombre}</p>
                  <p className="text-white/40 text-xs">{f.email} {f.telefono ? `· ${f.telefono}` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-white text-sm font-medium">{f.alumnas?.length ?? 0}</p>
                  <p className="text-white/40 text-xs">{f.alumnas?.length === 1 ? 'alumna' : 'alumnas'}</p>
                </div>
                <div className="flex gap-1">
                  <Link href={`/escuela/familias/${f.id}`}
                    className="text-xs text-white/40 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5">
                    Ver
                  </Link>
                  <button onClick={() => abrirEditar(f)}
                    className="text-xs text-white/40 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5">
                    Editar
                  </button>
                  <button onClick={() => abrirReset(f)}
                    className="text-xs text-white/40 hover:text-[#e91e8c] transition-colors px-2 py-1 rounded hover:bg-[#e91e8c]/10">
                    Clave
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
