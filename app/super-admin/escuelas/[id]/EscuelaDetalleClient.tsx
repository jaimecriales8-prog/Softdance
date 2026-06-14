'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Escuela = {
  id: string
  nombre: string
  ciudad: string | null
  email: string | null
  telefono: string | null
  activa: boolean
  cobro_activo: boolean
  plan: string
}

type Admin = {
  id: string
  nombre: string
  email: string
  created_at: string
}

export default function EscuelaDetalleClient({ escuela, admins: inicialesAdmins }: { escuela: Escuela; admins: Admin[] }) {
  const router = useRouter()
  const [admins, setAdmins] = useState(inicialesAdmins)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function crearAdmin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const res = await fetch('/api/super-admin/crear-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, escuela_id: escuela.id }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Error al crear el usuario')
    } else {
      setAdmins([...admins, data.perfil])
      setForm({ nombre: '', email: '', password: '' })
      setShowForm(false)
      setSuccess('Usuario creado exitosamente')
      setTimeout(() => setSuccess(''), 3000)
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/super-admin/escuelas" className="text-white/40 hover:text-white text-sm transition-colors">
          ← Escuelas
        </Link>
        <span className="text-white/20">/</span>
        <span className="text-white text-sm">{escuela.nombre}</span>
      </div>

      {/* Info escuela */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{escuela.nombre}</h1>
            <p className="text-white/40 text-sm mt-0.5">{escuela.ciudad} · {escuela.email}</p>
          </div>
          <div className="flex gap-2">
            <span className={`text-xs px-2 py-1 rounded-full ${escuela.activa ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}>
              {escuela.activa ? 'Activa' : 'Inactiva'}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full ${escuela.plan === 'pro' ? 'bg-[#e91e8c]/20 text-[#e91e8c]' : 'bg-white/10 text-white/40'}`}>
              {escuela.plan}
            </span>
          </div>
        </div>
      </div>

      {/* Admins */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Administradores</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Crear admin
        </button>
      </div>

      {success && (
        <div className="mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2 text-sm text-emerald-400">
          {success}
        </div>
      )}

      {/* Modal crear admin */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-1">Nuevo administrador</h2>
            <p className="text-white/40 text-xs mb-4">Se creará una cuenta para que gestione {escuela.nombre}</p>
            <form onSubmit={crearAdmin} className="space-y-3">
              {[
                { key: 'nombre', label: 'Nombre completo', type: 'text', required: true },
                { key: 'email', label: 'Correo electrónico', type: 'email', required: true },
                { key: 'password', label: 'Contraseña temporal', type: 'password', required: true },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-white/50 mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    required={f.required}
                    value={(form as any)[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#e91e8c]"
                  />
                </div>
              ))}
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setError('') }}
                  className="flex-1 border border-white/10 text-white/60 text-sm py-2 rounded-lg hover:bg-white/5 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-[#e91e8c] hover:bg-[#ff3da8] text-white text-sm py-2 rounded-lg disabled:opacity-50 transition-colors">
                  {loading ? 'Creando...' : 'Crear admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista admins */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        {admins.length === 0 ? (
          <p className="text-center text-white/30 py-8 text-sm">Esta escuela no tiene administradores aún</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Nombre</th>
                <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Correo</th>
                <th className="text-left text-white/40 text-xs uppercase tracking-wider px-4 py-3">Creado</th>
              </tr>
            </thead>
            <tbody>
              {admins.map(a => (
                <tr key={a.id} className="border-b border-white/5">
                  <td className="px-4 py-3 text-white">{a.nombre}</td>
                  <td className="px-4 py-3 text-white/60">{a.email}</td>
                  <td className="px-4 py-3 text-white/40 text-xs">
                    {new Date(a.created_at).toLocaleDateString('es-CO')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
