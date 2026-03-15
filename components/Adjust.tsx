'use client'
import { useState, useRef, useEffect } from 'react'
import type { Profile } from '@/lib/types'
import { sanitizeProfile } from '@/lib/sanitize'
import { fmt } from '@/lib/utils'

interface Msg { role: 'user' | 'ai' | 'err'; text: string; applied?: boolean }
interface Props {
  profile: Profile
  onSave: (updated: Profile) => Promise<void>
}

export default function Adjust({ profile, onSave }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([{
    role: 'ai',
    text: '¡Hola! Aquí puedes corregir cualquier dato de tu perfil en lenguaje natural.\n\nEjemplos:\n"Solo tengo 2 tarjetas de crédito, no 4"\n"Mi deuda del auto es $4.500.000 no $6.000.000"\n"Agrega tarjeta Santander Visa límite $1.200.000"\n"Borra la suscripción de HBO"\n"Mi sueldo ahora es $1.400.000"\n"El banco Edwards tiene $850.000 no $1.200.000"'
  }])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const buildSys = (prof: Profile) => `Eres el asistente de correcciones de Wallet, app de finanzas personales Chile (CLP pesos chilenos).

TAREA: El usuario describe una corrección en lenguaje natural. Debes aplicarla al perfil y devolver el perfil completo actualizado.

PERFIL ACTUAL:
- Bancos (${prof.bank_accounts?.length || 0}): ${(prof.bank_accounts || []).map(a => `${a.bank} ${a.account_type} saldo:${a.balance}`).join(', ') || 'ninguno'}
- Tarjetas crédito (${prof.credit_cards?.length || 0}): ${(prof.credit_cards || []).map(c => `${c.bank} ${c.name} límite:${c.limit} usado:${c.used}`).join(', ') || 'ninguna'}
- Ingresos fijos (${prof.incomes?.length || 0}): ${(prof.incomes || []).map(i => `${i.name} $${i.amount}`).join(', ') || 'ninguno'}
- Gastos fijos (${prof.fixed_expenses?.length || 0}): ${(prof.fixed_expenses || []).map(e => `${e.name} $${e.amount}`).join(', ') || 'ninguno'}
- Deudas (${prof.debts?.length || 0}): ${(prof.debts || []).map(d => `${d.name} total:${d.total_amount} cuota:${d.monthly_payment}`).join(', ') || 'ninguna'}
- Inversiones (${prof.investments?.length || 0}): ${(prof.investments || []).map(i => `${i.name} $${i.amount}`).join(', ') || 'ninguna'}

REGLAS CRÍTICAS:
1. TODOS los montos deben ser NÚMEROS (no strings). Ejemplo: amount: 150000, NO amount: "150000"
2. Campos opcionales nulos deben ser null, no strings vacíos
3. stability/growth_probability/loss_risk solo pueden ser: "alta", "media", "baja"
4. variance solo puede ser: "fija", "baja", "media", "alta"
5. account_type solo puede ser: "corriente", "vista", "ahorro"
6. pays_full debe ser true o false
7. Mantén TODOS los campos de cada objeto aunque no se modifiquen
8. monthly_log se mantiene exactamente igual

RESPONDE SOLO JSON PURO sin backticks ni texto extra:
{"action":"update","explanation":"qué cambiaste exactamente en 1-2 oraciones","profile":{PERFIL COMPLETO ACTUALIZADO}}

Si no entiendes la instrucción:
{"action":"clarify","text":"pregunta corta"}`

  const send = async () => {
    if (!input.trim() || sending) return
    const txt = input.trim()
    setInput('')
    setSending(true)
    const newMsgs: Msg[] = [...msgs, { role: 'user', text: txt }]
    setMsgs(newMsgs)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: buildSys(profile),
          messages: [{ role: 'user', content: txt }],
          max_tokens: 2500,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const raw = data.text.replace(/```json|```/g, '').trim()
      let p: { action: string; explanation?: string; text?: string; profile?: Profile }
      try { p = JSON.parse(raw) }
      catch {
        const m = raw.match(/\{[\s\S]*\}/)
        p = m ? JSON.parse(m[0]) : { action: 'clarify', text: 'No pude interpretar la respuesta. Intenta de nuevo.' }
      }

      if (p.action === 'update' && p.profile) {
        // Sanitize to prevent NaN
        const clean = sanitizeProfile({ ...p.profile, id: profile.id, user_id: profile.user_id, monthly_log: profile.monthly_log })
        await onSave(clean)
        setMsgs([...newMsgs, { role: 'ai', text: p.explanation || 'Perfil actualizado.', applied: true }])
      } else {
        setMsgs([...newMsgs, { role: 'ai', text: p.text || 'No entendí la instrucción, ¿puedes ser más específico?' }])
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error'
      setMsgs([...newMsgs, { role: 'err', text: 'Error: ' + msg.substring(0, 120) }])
    }
    setSending(false)
  }

  const totalInc = (profile.incomes || []).reduce((s, i) => s + (i.amount || 0), 0)
  const totalExp = (profile.fixed_expenses || []).reduce((s, e) => s + (e.amount || 0), 0)
  const totalDebt = (profile.debts || []).reduce((s, d) => s + (d.total_amount || 0), 0)
  const totalCards = (profile.credit_cards || []).length
  const totalBanks = (profile.bank_accounts || []).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f0f0ed' }}>
      <div style={{ padding: '20px 16px 12px', background: '#fff', borderBottom: '1px solid #e2e2de' }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 2 }}>Ajustar perfil</div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>Corrige tu información financiera en lenguaje natural</div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { label: `${totalBanks} banco${totalBanks !== 1 ? 's' : ''}`, color: '#1a6ef5' },
            { label: `${totalCards} tarjeta${totalCards !== 1 ? 's' : ''}`, color: '#7b68ee' },
            { label: `+${fmt(totalInc)}/mes`, color: '#16a34a' },
            { label: `-${fmt(totalExp)}/mes`, color: '#dc2626' },
            { label: `Deuda: ${fmt(totalDebt)}`, color: '#f59e0b' },
          ].map((pill, i) => (
            <span key={i} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, fontWeight: 500, background: pill.color + '18', color: pill.color }}>
              {pill.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 scrollable" style={{ padding: '12px 16px' }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', marginBottom: 10, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div className={m.role === 'user' ? 'bubble-user' : m.role === 'err' ? 'bubble-err' : 'bubble-ai'}
              style={{ maxWidth: '84%', padding: '10px 14px', fontSize: 14, lineHeight: 1.55 }}>
              {m.text.split('\n').map((line, j) => (
                <span key={j}>{line}{j < m.text.split('\n').length - 1 && <br />}</span>
              ))}
              {m.applied && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #d1fae5', fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                  ✓ Perfil actualizado
                </div>
              )}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display: 'flex', marginBottom: 10 }}>
            <div className="bubble-ai" style={{ padding: '10px 14px', fontSize: 14, color: '#888' }}>Aplicando cambios...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ borderTop: '1px solid #e2e2de', padding: '10px 12px', display: 'flex', gap: 8, background: '#fff' }} className="safe-bottom">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder='"Corrige mi deuda del banco a $2.000.000"'
          className="input-base" style={{ flex: 1 }} />
        <button onClick={send} disabled={sending || !input.trim()} className="btn-primary"
          style={{ width: 44, height: 44, padding: 0, borderRadius: 12, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
      </div>
    </div>
  )
}
