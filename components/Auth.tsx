'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

type Step = 'email' | 'code'

export default function Auth() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const sendCode = async () => {
    if (!email || !email.includes('@')) { setError('Ingresa un email válido'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    if (err) setError(err.message)
    else setStep('code')
    setLoading(false)
  }

  const verifyCode = async () => {
    if (code.length < 4) { setError('El código tiene 6 dígitos'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })
    if (err) setError('Código incorrecto o expirado')
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '0 24px', background: '#f0f0ed' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, background: '#1a6ef5', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: '#fff', margin: '0 auto 14px' }}>W</div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>Wallet</div>
          <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>Tu asistente financiero personal</div>
        </div>

        {step === 'email' ? (
          <>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>Email</div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendCode()}
                placeholder="tu@email.com"
                style={{ width: '100%', padding: '13px 16px', border: '1.5px solid #e2e2de', borderRadius: 14, fontSize: 16, background: '#fff', color: '#1a1a1a', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
            {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 10 }}>{error}</div>}
            <button onClick={sendCode} disabled={loading}
              style={{ width: '100%', padding: '14px', background: '#1a6ef5', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.5 : 1, fontFamily: 'inherit' }}>
              {loading ? 'Enviando...' : 'Enviar código'}
            </button>
            <div style={{ textAlign: 'center', fontSize: 12, color: '#aaa', marginTop: 12 }}>
              Te enviamos un código de 6 dígitos al email
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 6, fontSize: 14, color: '#555', textAlign: 'center' }}>
              Código enviado a <strong>{email}</strong>
            </div>
            <div style={{ marginBottom: 16, fontSize: 12, color: '#aaa', textAlign: 'center' }}>Revisa tu bandeja de entrada o spam</div>
            <input
              type="number"
              value={code}
              onChange={e => setCode(e.target.value.slice(0, 8))}
              onKeyDown={e => e.key === 'Enter' && verifyCode()}
              placeholder="000000"
              style={{ width: '100%', padding: '16px', border: '1.5px solid #e2e2de', borderRadius: 14, fontSize: 28, fontWeight: 700, letterSpacing: 12, textAlign: 'center', background: '#fff', color: '#1a1a1a', outline: 'none', fontFamily: 'inherit', marginBottom: 12 }}
            />
            {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 10, textAlign: 'center' }}>{error}</div>}
            <button onClick={verifyCode} disabled={loading || code.length < 4}
              style={{ width: '100%', padding: '14px', background: '#1a6ef5', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 600, cursor: 'pointer', opacity: (loading || code.length < 6) ? 0.5 : 1, fontFamily: 'inherit' }}>
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
            <button onClick={() => { setStep('email'); setCode(''); setError('') }}
              style={{ width: '100%', padding: '12px', background: 'none', border: 'none', fontSize: 13, color: '#888', cursor: 'pointer', marginTop: 8 }}>
              Usar otro email
            </button>
          </>
        )}
      </div>
    </div>
  )
}
