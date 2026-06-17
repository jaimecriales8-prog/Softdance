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
  const [escuelaVerificada, setEscuelaVerificada] = useState<string | null>(null)
  const [verificando, setVerificando] = useState(false)

  const codigosValidos = codigos.filter(c => c.trim().length > 0)

  async function verificarCodigos() {
    if (codigosValidos.length === 0) return
    setVerificando(true)
    setError('')
    setAlumnasPrevisualizadas(null)
    setEscuelaVerificada(null)
    try {
      const res = await fetch('/api/auth/registro/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigos: codigosValidos }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setAlumnasPrevisualizadas(data.alumnas)
      setEscuelaVerificada(data.escuela)
    } finally {
      setVerificando(false)
    }
  }

  function resetVerificacion() {
    setAlumnasPrevisualizadas(null)
    setEscuelaVerificada(null)
    setError('')
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

  const verificado = !!alumnasPrevisualizadas

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xl font-bold text-white mb-1">
            Soft<span className="text-[#e91e8c]">dance</span>
          </p>
          <h1 className="text-2xl font-bold text-white mt-3 mb-1">Crear cuenta</h1>
          <p className="text-white/40 text-sm">Ingresa el código que te dio la escuela</p>
        </div>

        <div className="bg-white/8 border border-white/20 rounded-2xl overflow-hidden">

          {/* PASO 1: Códigos */}
          <div className={`p-5 ${verificado ? 'border-b border-white/10' : ''}`}>
            <div className="flex items-center gap-2 mb-4">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${verificado ? 'bg-green-500 text-white' : 'bg-[#e91e8c] text-white'}`}>
                {verificado ? '✓' : '1'}
              </div>
              <p className="text-sm font-medium text-white">Código(s) de vinculación</p>
            </div>

            {!verificado ? (
              <div className="space-y-2">
                {codigos.map((c, i) => (
                  <input
                    key={i}
                    value={c}
                    onChange={e => {
                      const nuevos = [...codigos]
                      nuevos[i] = e.target.value.toUpperCase()
                      setCodigos(nuevos)
                    }}
                    placeholder={i === 0 ? 'Ej: SD-7KM2P' : `Código hija ${i + 1} (opcional)`}
                    className="w-full bg-white/8 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 font-mono focus:outline-none focus:border-[#e91e8c]"
                  />
                ))}

                {error && (
                  <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mt-1">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={verificarCodigos}
                  disabled={verificando || codigosValidos.length === 0}
                  className="w-full mt-1 bg-white/10 hover:bg-white/20 text-white text-sm font-medium py-3 rounded-xl transition-colors disabled:opacity-40">
                  {verificando ? 'Verificando...' : 'Verificar código'}
                </button>
              </div>
            ) : (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <p className="text-xs font-semibold text-green-400 mb-3">{escuelaVerificada}</p>
                <div className="space-y-2">
                  {alumnasPrevisualizadas!.map(a => (
                    <div key={a.codigo} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#e91e8c]/20 flex items-center justify-center text-[#e91e8c] text-xs font-bold shrink-0">
                        {a.nombre.charAt(0)}
                      </div>
                      <span className="text-white text-sm">{a.nombre}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={resetVerificacion}
                  className="text-xs text-white/30 hover:text-white mt-3 transition-colors">
                  Cambiar código
                </button>
              </div>
            )}
          </div>

          {/* PASO 2: Datos de cuenta — solo visible tras verificar */}
          {verificado && (
            <form onSubmit={registrar} className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full bg-[#e91e8c] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  2
                </div>
                <p className="text-sm font-medium text-white">Datos de tu cuenta</p>
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1.5">Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="tu@correo.com"
                  className="w-full bg-white/8 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#e91e8c]"
                />
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1.5">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-white/8 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#e91e8c]"
                />
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1.5">Confirmar contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repite la contraseña"
                  className="w-full bg-white/8 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#e91e8c]"
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={cargando}
                className="w-full bg-[#e91e8c] hover:bg-[#c91878] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-40">
                {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-white/30 text-sm mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-[#e91e8c] hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}
