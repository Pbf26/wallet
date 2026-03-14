'use client'
import { useState, useRef, useEffect } from 'react'
import type { Profile } from '@/lib/types'
import { fmt } from '@/lib/utils'

interface Msg { role: 'user' | 'ai' | 'err'; text: string }

const OB_SYS = `Eres el asesor financiero de Wallet, una app personal de finanzas para Chile (moneda: pesos chilenos CLP). Tu trabajo es hacer un diagnóstico financiero profundo y personalizado a través de una conversación natural.

FILOSOFÍA: No hagas preguntas genéricas. Por cada ingreso y por cada gasto fijo, indaga en detalle. Quieres entender no solo los números, sino la naturaleza, estabilidad y perspectiva de cada ítem. Sé cálido, directo y usa tuteo.

TEMAS A CUBRIR en este orden lógico:
1. SALDO ACTUAL — saldo total disponible hoy en cuentas y efectivo
2. INGRESOS — por cada fuente: qué es exactamente, monto neto mensual, tipo de contrato/relación laboral, estabilidad, probabilidad de crecimiento o pérdida en 12 meses, bonos o variables, día que llega. Preguntar si hay más fuentes hasta agotarlas.
3. VIVIENDA — arriendo o propiedad, monto, día de pago, reajustes, gastos comunes
4. CUENTAS DEL HOGAR — luz, agua, gas, internet, teléfono: monto promedio y varianza
5. TARJETAS DE CRÉDITO — banco, si paga total o cuotas, monto mensual, cuotas pendientes, día de pago
6. SUSCRIPCIONES — nombre exacto, monto, si es CLP o USD
7. SEGUROS — tipo, compañía, monto mensual
8. DEUDAS — tipo, institución, cuota, total pendiente, cuotas restantes, tasa
9. INVERSIONES — AFP, APV, fondos mutuos, acciones, cripto, propiedades
10. OTROS COMPROMISOS — pensión alimenticia, ayuda a familiares, otros fijos

REGLAS: Tutéalo. Máximo 2 preguntas por mensaje. Profundiza antes de pasar al siguiente tema. Usa contexto previo. Cuando tengas suficiente info, genera el perfil completo.

RESPONDE SOLO JSON PURO sin backticks ni markdown, sin ningún texto antes o después del JSON.

Durante conversación: {"action":"question","text":"mensaje aquí","progress":0-100}

Cuando completo: {"action":"complete","summary":"3-4 oraciones situación + riesgos/oportunidades","profile":{"current_balance":number,"incomes":[{"name":"string","description":"string","amount":number,"day_of_month":null,"stability":"alta|media|baja","growth_probability":"alta|media|baja","loss_risk":"alta|media|baja","notes":"string"}],"fixed_expenses":[{"name":"string","category":"string","amount":number,"variance":"fija|baja|media|alta","variance_notes":"string","day_of_month":null,"notes":"string"}],"debts":[{"name":"string","institution":"string","monthly_payment":number,"total_amount":number,"months_remaining":null,"interest_rate":null}],"investments":[{"name":"string","amount":number,"type":"string","monthly_contribution":null}]}}`

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
        setMsgs([{ role: 'ai', text: '¡Hola! Soy tu asesor financiero de Wallet. Vamos a conocer tu situación en detalle.\n\n¿Cuánto dinero tienes disponible hoy sumando todas tus cuentas bancarias y efectivo?' }])
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, confirming])

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
      incomes: pending.incomes || [],
      fixed_expenses: pending.fixed_expenses || [],
      debts: pending.debts || [],
      investments: pending.investments || [],
      monthly_log: {},
    })
  }

  const fmt2 = fmt

  if (confirming && pending) {
    const tInc = (pending.incomes || []).reduce((s, i) => s + i.amount, 0)
    const tExp = (pending.fixed_expenses || []).reduce((s, e) => s + e.amount, 0)
    const net = tInc - tExp
    return (
      <div className="flex flex-col h-screen bg-white">
        <div className="flex-1 scrollable px-4 pt-6 pb-4">
          <div className="text-lg font-semibold mb-1">Tu perfil financiero</div>
          <div className="text-sm text-gray-500 mb-5 leading-relaxed">{summary}</div>

          {pending.current_balance > 0 && (
            <div className="mb-4">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Saldo inicial</div>
              <div className="border border-gray-100 rounded-2xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Cuentas y efectivo</span>
                  <span className="text-sm font-semibold text-green-600">{fmt2(pending.current_balance)}</span>
                </div>
              </div>
            </div>
          )}

          {pending.incomes?.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Ingresos fijos</div>
              <div className="border border-gray-100 rounded-2xl divide-y divide-gray-50">
                {pending.incomes.map((inc, i) => (
                  <div key={i} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="text-sm font-medium">{inc.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{inc.description}</div>
                        {inc.notes && <div className="text-xs text-gray-400 mt-0.5">{inc.notes}</div>}
                      </div>
                      <span className="text-sm font-semibold text-green-600 whitespace-nowrap">+{fmt2(inc.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pending.fixed_expenses?.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Gastos fijos</div>
              <div className="border border-gray-100 rounded-2xl divide-y divide-gray-50">
                {pending.fixed_expenses.map((exp, i) => (
                  <div key={i} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="text-sm font-medium">{exp.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{exp.category}{exp.variance_notes ? ' · ' + exp.variance_notes : ''}</div>
                      </div>
                      <span className="text-sm font-semibold text-red-500 whitespace-nowrap">-{fmt2(exp.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pending.debts?.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Deudas</div>
              <div className="border border-gray-100 rounded-2xl divide-y divide-gray-50">
                {pending.debts.map((d, i) => (
                  <div key={i} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="text-sm font-medium">{d.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{d.institution}{d.months_remaining ? ` · ${d.months_remaining} cuotas` : ''}</div>
                        <div className="text-xs text-gray-400">Pendiente: {fmt2(d.total_amount)}</div>
                      </div>
                      <span className="text-sm font-semibold text-red-500 whitespace-nowrap">-{fmt2(d.monthly_payment)}/mes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border border-gray-100 rounded-2xl p-4 mb-6">
            <div className="flex justify-between text-sm mb-2"><span className="text-gray-500">Ingresos fijos / mes</span><span className="text-green-600 font-medium">+{fmt2(tInc)}</span></div>
            <div className="flex justify-between text-sm mb-3"><span className="text-gray-500">Gastos fijos / mes</span><span className="text-red-500 font-medium">-{fmt2(tExp)}</span></div>
            <div className="flex justify-between text-sm pt-3 border-t border-gray-100">
              <span className="font-medium">Disponible estimado</span>
              <span className={`font-semibold ${net >= 0 ? 'text-green-600' : 'text-red-500'}`}>{net >= 0 ? '+' : ''}{fmt2(net)}</span>
            </div>
          </div>
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-gray-100 p-4 flex gap-3 safe-bottom">
          <button onClick={() => setConfirming(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-medium">
            Corregir algo
          </button>
          <button onClick={handleConfirm} disabled={saving} className="flex-1 py-3 bg-black text-white rounded-xl text-sm font-medium disabled:opacity-50">
            {saving ? 'Guardando...' : 'Confirmar →'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="px-4 pt-5 pb-2">
        <div className="text-lg font-semibold">Configuración inicial</div>
        <div className="text-xs text-gray-400 mt-0.5">Cuéntame tu situación financiera</div>
        <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-black rounded-full transition-all duration-500" style={{ width: progress + '%' }} />
        </div>
      </div>

      <div className="flex-1 scrollable px-4 py-3">
        {msgs.map((m, i) => (
          <div key={i} className={`flex mb-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${m.role === 'user' ? 'bubble-user' : m.role === 'err' ? 'bubble-err' : 'bubble-ai'}`}>
              {m.text.split('\n').map((line, j) => <span key={j}>{line}{j < m.text.split('\n').length - 1 && <br />}</span>)}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start mb-3">
            <div className="bubble-ai px-4 py-3 text-sm text-gray-400">Pensando...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-gray-100 p-3 safe-bottom flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Escribe aquí..."
          className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none"
        />
        <button onClick={send} disabled={sending || !input.trim()} className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center disabled:opacity-40 text-lg">
          ↑
        </button>
      </div>
    </div>
  )
}
