'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegistroPage() {
  const router = useRouter()
  const [codigos, setCodigos] = useState(['', '', ''])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [alumnasPrevisualizadas, setAlumnasPrevisualizadas] = useState<{ nombre: string; codigo: string }[] | null>(null)
  const [verificando, setVerificando] = useState(false)

  const codigosValidos = codigos.filter(c => c.trim().length > 0)

  async function verificarCodigos() {
    if (codigosValidos.length === 0) return
    setVerificando(true)
    setError('')
    setAlumnasPrevisualizadas(null)
    try {
      const res = await fetch('/api/auth/registro/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigos: codigosValidos }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setAlumnasPrevisualizadas(data.alumnas)
    } finally {
      setVerificando(false)
    }
  }

  async function registrar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (!alumnasPrevisualizadas) { setError('Primero verifica los códigos'); return }

    setCargando(true)
    try {
      const res = await fetch('/api/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, codigos: codigosValidos }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push('/familia')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Crear cuenta</h1>
          <p className="text-white/40 text-sm">Ingresa el código que te dio la escuela para vincular a tu hija</p>
        </div>

        <form onSubmit={registrar} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">

          {/* Códigos de vinculación */}
          <div>
            <label className="block text-xs text-white/50 uppercase tracking-wider mb-3">
              Código(s) de vinculación
            </label>
            <div className="space-y-2">
              {codigos.map((c, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={c}
                    onChange={e => {
                      const nuevos = [...codigos]
                      nuevos[i] = e.target.value.toUpperCase()
                      setCodigos(nuevos)
                      setAlumnasPrevisualizadas(null)
                    }}
                    placeholder={i === 0 ? 'Ej: SD-7KM2P (obligatorio)' : `Código hija ${i + 1} (opcional)`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 font-mono focus:outline-none focus:border-[#e91e8c]"
                  />
                  {i === 0 && (
                    <button
                      type="button"
                      onClick={verificarCodigos}
                      disabled={verificando || codigosValidos.length === 0}
                      className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap">
                      {verificando ? '...' : 'Verificar'}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Previsualización alumnas */}
            {alumnasPrevisualizadas && (
              <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3 space-y-1">
                <p className="text-xs text-green-400 font-medium mb-2">Alumnas encontradas:</p>
                {alumnasPrevisualizadas.map(a => (
                  <div key={a.codigo} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#e91e8c]/20 flex items-center justify-center text-[#e91e8c] text-xs font-bold">
                      {a.nombre.charAt(0)}
                    </div>
                    <span className="text-white text-sm">{a.nombre}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="tu@correo.com"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]"
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 uppercase tracking-wider mb-1.5">
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              placeholder="Repite la contraseña"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c]"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando || !alumnasPrevisualizadas}
            className="w-full bg-[#e91e8c] hover:bg-[#c91878] text-white font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>

          <p className="text-center text-white/30 text-sm">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-[#e91e8c] hover:underline">Inicia sesión</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
