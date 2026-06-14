'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Ocurrió un error')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Soft<span className="text-[#e91e8c]">dance</span>
          </h1>
          <p className="text-white/40 text-sm mt-2">Gestión de escuelas de danza</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-xl mx-auto mb-4">✓</div>
              <h2 className="text-lg font-semibold text-white mb-2">Revisa tu correo</h2>
              <p className="text-white/50 text-sm">
                Si el correo está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
              </p>
              <Link href="/login" className="block mt-6 text-sm text-[#e91e8c] hover:text-[#ff3da8] transition-colors">
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-white mb-2">Olvidé mi contraseña</h2>
              <p className="text-white/40 text-sm mb-6">Ingresa tu correo y te enviaremos un enlace para restablecerla.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">Correo electrónico</label>
                  <input
                    type="email" required value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#e91e8c] transition-colors"
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
                )}
                <button type="submit" disabled={loading}
                  className="w-full bg-[#e91e8c] hover:bg-[#ff3da8] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 transition-colors">
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </button>
              </form>
              <Link href="/login" className="block mt-4 text-center text-sm text-white/40 hover:text-white transition-colors">
                ← Volver
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
