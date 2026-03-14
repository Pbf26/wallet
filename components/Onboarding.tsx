'use client'
import { useState, useRef, useEffect } from 'react'
import type { Profile } from '@/lib/types'
import { fmt } from '@/lib/utils'

interface Msg { role: 'user' | 'ai' | 'err'; text: string }

const OB_SYS = `Eres el asesor financiero de Wallet, app de finanzas personales para Chile (CLP). Haz un diagnóstico financiero profundo y personalizado. Sé cálido, usa tuteo, máximo 2 preguntas por mensaje.

TEMAS EN ORDEN:

1. BANCOS Y CUENTAS — pregunta cuántos bancos tiene. Por CADA banco:
   - Nombre del banco (BancoEstado, Santander, BCI, Scotiabank, Banco de Chile/Edwards, Itaú, BICE, Security, Falabella, Ripley, otro)
   - Qué productos tiene en ese banco: cuenta corriente, cuenta vista/RUT, cuenta de ahorro
   - Saldo actual en cada cuenta
   - Si tiene tarjeta de débito asociada
   - Si tiene tarjeta de crédito en ese banco: nombre de la tarjeta, límite de crédito, cuánto tiene usado actualmente, día de cierre/pago, si paga el total o mínimo cada mes

2. INGRESOS — por cada fuente:
   - Descripción exacta (empleado dependiente, honorarios, negocio propio, arriendo recibido, etc.)
   - Monto neto mensual que llega a la cuenta
   - Si es dependiente: tipo de contrato (indefinido/plazo fijo), estabilidad de la empresa/empleo
   - Si es independiente: cantidad de clientes, si es recurrente o por proyecto
   - Probabilidad de que ese ingreso crezca en 12 meses (alta/media/baja) y por qué
   - Probabilidad de que desaparezca o baje (alta/media/baja) y por qué
   - Bonos, comisiones u otros variables anuales
   - Día del mes que llega ese ingreso
   - ¿Tiene otras fuentes? Preguntar hasta agotar todas.

3. VIVIENDA — arriendo o propiedad propia:
   - Si arrienda: monto, día de pago, reajuste anual (UF, IPC, fijo)
   - Si tiene dividendo: banco, monto cuota, años restantes
   - Gastos comunes si aplica

4. CUENTAS DEL HOGAR — por cada servicio:
   - Nombre (luz, agua, gas, internet, teléfono fijo, celular)
   - Monto promedio mensual
   - Varianza: ¿sube en invierno? ¿cuánto puede subir?

5. SUSCRIPCIONES — por cada una:
   - Nombre exacto del servicio
   - Monto mensual (si es anual, dividir por 12)
   - Si se cobra en USD, preguntar tipo de cambio que usa

6. SEGUROS — por cada uno:
   - Tipo (vida, auto, complementario salud, hogar, otro)
   - Compañía y monto mensual

7. DEUDAS ACTIVAS — por cada deuda:
   - Tipo (crédito consumo, automotriz, hipotecario, DICOM, otro)
   - Institución
   - Cuota mensual
   - Monto total pendiente
   - Cuotas restantes
   - Tasa de interés si la sabe

8. INVERSIONES Y AHORRO:
   - AFP: cuál, en qué fondo (A/B/C/D/E), saldo aproximado
   - APV: si tiene, monto mensual que aporta
   - Fondos mutuos, ETFs, acciones: institución y monto
   - Cripto, dólares, oro u otros activos
   - Propiedades adicionales: valor estimado, si genera renta

9. OTROS COMPROMISOS:
   - Pensión alimenticia u obligaciones legales
   - Ayuda económica a familiares mensual
   - Cualquier otro gasto fijo no cubierto

CUANDO TENGAS INFO SUFICIENTE (mínimo bancos + ingresos + gastos principales), genera el perfil.

RESPONDE SOLO JSON PURO sin backticks:

Conversación: {"action":"question","text":"mensaje","progress":0-100}

Completo: {"action":"complete","summary":"3-4 oraciones sobre situación, riesgos y oportunidades","profile":{"current_balance":number,"bank_accounts":[{"bank":"string","account_type":"corriente|vista|ahorro","balance":number,"account_number":null}],"credit_cards":[{"bank":"string","name":"string","limit":number,"used":number,"payment_day":null,"pays_full":true}],"incomes":[{"name":"string","description":"string","amount":number,"day_of_month":null,"stability":"alta|media|baja","growth_probability":"alta|media|baja","loss_risk":"alta|media|baja","notes":"string"}],"fixed_expenses":[{"name":"string","category":"string","amount":number,"variance":"fija|baja|media|alta","variance_notes":"string","day_of_month":null,"notes":"string"}],"debts":[{"name":"string","institution":"string","monthly_payment":number,"total_amount":number,"months_remaining":null,"interest_rate":null}],"investments":[{"name":"string","amount":number,"type":"string","monthly_contribution":null}]}}`

interface Props { onComplete: (p: Profile) => Promise<void> }

export default function Onboarding({ onComplete }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [history, setHistory] = useState<{ role: string; content: string }[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState(0)
  const [pending, setPending] = useState<Profile | null>(null)
  const [summary, setSummary] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const callAI = async (hist: { role: string; content: string }[]) => {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: OB_SYS, messages: hist }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    return data.text as string
  }

  const extractJSON = (raw: string) => {
    const clean = raw.replace(/```json|```/g, '').trim()
    try { return JSON.parse(clean) } catch { }
    const m = clean.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
    throw new Error('No JSON found')
  }

  useEffect(() => {
    const init = async () => {
      const startHistory = [{ role: 'user', content: 'Hola, quiero configurar mi Wallet financiero personal' }]
      setHistory(startHistory)
      try {
        const raw = await callAI(startHistory)
        const p = extractJSON(raw)
        setHistory([...startHistory, { role: 'assistant', content: raw }])
        if (p.progress != null) setProgress(p.progress)
        if (p.action === 'complete') { setPending(p.profile); setSummary(p.summary); setConfirming(true) }
        else setMsgs([{ role: 'ai', text: p.text }])
      } catch {
        setMsgs([{ role: 'ai', text: '¡Hola! Soy tu asesor financiero de Wallet.\n\nPara empezar, cuéntame: ¿en cuántos bancos tienes cuentas actualmente?' }])
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, confirming])

  const send = async () => {
    if (!input.trim() || sending) return
    const txt = input.trim()
    setInput('')
    setSending(true)
    const newMsgs: Msg[] = [...msgs, { role: 'user', text: txt }]
    setMsgs(newMsgs)
    const newHist = [...history, { role: 'user', content: txt }]
    setHistory(newHist)
    try {
      const raw = await callAI(newHist)
      const p = extractJSON(raw)
      setHistory([...newHist, { role: 'assistant', content: raw }])
      if (p.progress != null) setProgress(p.progress)
      if (p.action === 'complete') { setPending(p.profile); setSummary(p.summary); setConfirming(true) }
      else setMsgs([...newMsgs, { role: 'ai', text: p.text }])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      setMsgs([...newMsgs, { role: 'err', text: 'Error: ' + msg }])
    }
    setSending(false)
  }

  const handleConfirm = async () => {
    if (!pending) return
    setSaving(true)
    await onComplete({
      current_balance: pending.current_balance || 0,
      bank_accounts: pending.bank_accounts || [],
      credit_cards: pending.credit_cards || [],
      incomes: pending.incomes || [],
      fixed_expenses: pending.fixed_expenses || [],
      debts: pending.debts || [],
      investments: pending.investments || [],
      monthly_log: {},
    })
  }

  if (confirming && pending) {
    const totalBank = (pending.bank_accounts || []).reduce((s, a) => s + a.balance, 0)
    const totalDebt = (pending.debts || []).reduce((s, d) => s + d.total_amount, 0)
    const totalCardUsed = (pending.credit_cards || []).reduce((s, c) => s + c.used, 0)
    const netWorth = totalBank - totalDebt - totalCardUsed
    const tInc = (pending.incomes || []).reduce((s, i) => s + i.amount, 0)
    const tExp = (pending.fixed_expenses || []).reduce((s, e) => s + e.amount, 0)

    return (
      <div className="flex flex-col h-screen" style={{ background: '#f0f0ed' }}>
        <div className="flex-1 scrollable px-4 pt-6 pb-4">
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Tu perfil financiero</div>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 20, lineHeight: 1.6 }}>{summary}</div>

          {/* Net worth summary */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Situación neta</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
              <span style={{ color: '#555' }}>Cash en cuentas</span>
              <span style={{ color: '#16a34a', fontWeight: 600 }}>{fmt(totalBank)}</span>
            </div>
            {totalCardUsed > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
              <span style={{ color: '#555' }}>Deuda tarjetas</span>
              <span style={{ color: '#dc2626', fontWeight: 600 }}>-{fmt(totalCardUsed)}</span>
            </div>}
            {totalDebt > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
              <span style={{ color: '#555' }}>Deudas activas</span>
              <span style={{ color: '#dc2626', fontWeight: 600 }}>-{fmt(totalDebt)}</span>
            </div>}
            <hr className="divider" style={{ margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700 }}>
              <span>Patrimonio neto</span>
              <span style={{ color: netWorth >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(netWorth)}</span>
            </div>
          </div>

          {pending.bank_accounts?.length > 0 && (
            <div className="card">
              <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Cuentas bancarias</div>
              {pending.bank_accounts.map((a, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 8, marginBottom: 8, borderBottom: i < pending.bank_accounts.length - 1 ? '1px solid #e2e2de' : 'none' }}>
                  <div><div style={{ fontWeight: 500 }}>{a.bank}</div><div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{a.account_type}</div></div>
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>{fmt(a.balance)}</span>
                </div>
              ))}
            </div>
          )}

          {pending.credit_cards?.length > 0 && (
            <div className="card">
              <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Tarjetas de crédito</div>
              {pending.credit_cards.map((c, i) => (
                <div key={i} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: i < pending.credit_cards.length - 1 ? '1px solid #e2e2de' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <div><div style={{ fontWeight: 500 }}>{c.bank} — {c.name}</div><div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Límite: {fmt(c.limit)}{c.payment_day ? ` · Día pago: ${c.payment_day}` : ''}</div></div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#dc2626', fontWeight: 600, fontSize: 13 }}>-{fmt(c.used)}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>usado</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pending.incomes?.length > 0 && (
            <div className="card">
              <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Ingresos fijos</div>
              {pending.incomes.map((inc, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 8, marginBottom: 8, borderBottom: i < pending.incomes.length - 1 ? '1px solid #e2e2de' : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                    <div style={{ fontWeight: 500 }}>{inc.name}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{inc.description}</div>
                    {inc.notes && <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>{inc.notes}</div>}
                  </div>
                  <span style={{ color: '#16a34a', fontWeight: 600, whiteSpace: 'nowrap' }}>+{fmt(inc.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {pending.fixed_expenses?.length > 0 && (
            <div className="card">
              <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Gastos fijos</div>
              {pending.fixed_expenses.map((exp, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 8, marginBottom: 8, borderBottom: i < pending.fixed_expenses.length - 1 ? '1px solid #e2e2de' : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                    <div style={{ fontWeight: 500 }}>{exp.name}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{exp.category}{exp.variance_notes ? ' · ' + exp.variance_notes : ''}</div>
                  </div>
                  <span style={{ color: '#dc2626', fontWeight: 600, whiteSpace: 'nowrap' }}>-{fmt(exp.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {pending.debts?.length > 0 && (
            <div className="card">
              <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Deudas activas</div>
              {pending.debts.map((d, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 8, marginBottom: 8, borderBottom: i < pending.debts.length - 1 ? '1px solid #e2e2de' : 'none' }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                    <div style={{ fontWeight: 500 }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{d.institution}{d.months_remaining ? ` · ${d.months_remaining} cuotas` : ''}{d.interest_rate ? ` · ${d.interest_rate}%` : ''}</div>
                    <div style={{ fontSize: 11, color: '#aaa' }}>Total pendiente: {fmt(d.total_amount)}</div>
                  </div>
                  <span style={{ color: '#dc2626', fontWeight: 600, whiteSpace: 'nowrap' }}>-{fmt(d.monthly_payment)}/mes</span>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
              <span style={{ color: '#555' }}>Ingresos fijos / mes</span>
              <span style={{ color: '#16a34a', fontWeight: 600 }}>+{fmt(tInc)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 10 }}>
              <span style={{ color: '#555' }}>Gastos fijos / mes</span>
              <span style={{ color: '#dc2626', fontWeight: 600 }}>-{fmt(tExp)}</span>
            </div>
            <hr className="divider" style={{ margin: '8px 0 10px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
              <span>Disponible estimado / mes</span>
              <span style={{ color: tInc - tExp >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(tInc - tExp)}</span>
            </div>
          </div>

          <div ref={bottomRef} />
        </div>

        <div style={{ borderTop: '1px solid #e2e2de', padding: '12px 16px', display: 'flex', gap: 10, background: '#fff' }} className="safe-bottom">
          <button onClick={() => setConfirming(false)} className="btn-secondary" style={{ flex: 1 }}>Corregir algo</button>
          <button onClick={handleConfirm} disabled={saving} className="btn-primary" style={{ flex: 1 }}>
            {saving ? 'Guardando...' : 'Confirmar →'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: '#f0f0ed' }}>
      <div style={{ padding: '20px 16px 8px', background: '#fff', borderBottom: '1px solid #e2e2de' }}>
        <div style={{ fontSize: 17, fontWeight: 600 }}>Configuración inicial</div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Cuéntame tu situación financiera en detalle</div>
        <div style={{ marginTop: 10, height: 3, background: '#e2e2de', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#1a1a1a', borderRadius: 4, width: progress + '%', transition: 'width 0.5s' }} />
        </div>
      </div>

      <div className="flex-1 scrollable" style={{ padding: '12px 16px' }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', marginBottom: 10, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div className={m.role === 'user' ? 'bubble-user' : m.role === 'err' ? 'bubble-err' : 'bubble-ai'}
              style={{ maxWidth: '82%', padding: '10px 14px', fontSize: 14, lineHeight: 1.55 }}>
              {m.text.split('\n').map((line, j) => <span key={j}>{line}{j < m.text.split('\n').length - 1 && <br />}</span>)}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display: 'flex', marginBottom: 10 }}>
            <div className="bubble-ai" style={{ padding: '10px 14px', fontSize: 14, color: '#888' }}>Pensando...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ borderTop: '1px solid #e2e2de', padding: '10px 12px', display: 'flex', gap: 8, background: '#fff' }} className="safe-bottom">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Escribe aquí..." className="input-base" style={{ flex: 1 }} />
        <button onClick={send} disabled={sending || !input.trim()} className="btn-primary"
          style={{ width: 44, height: 44, padding: 0, borderRadius: 12, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
      </div>
    </div>
  )
}
