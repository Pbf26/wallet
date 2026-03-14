'use client'
import { useState } from 'react'
import type { Profile } from '@/lib/types'
import { fmt, stabLabel, stabColor, varLabel } from '@/lib/utils'

interface Props {
  profile: Profile
  onMarkFixed: (type: 'inc' | 'exp', idx: number, bank?: string, method?: string) => Promise<void>
}

export default function Fixed({ profile, onMarkFixed }: Props) {
  const mk = new Date().toISOString().substring(0, 7)
  const ml = profile.monthly_log?.[mk] || {}
  const [marking, setMarking] = useState<string | null>(null)
  const [bankSelect, setBankSelect] = useState<{ type: 'inc' | 'exp'; idx: number } | null>(null)
  const [chosenBank, setChosenBank] = useState('')
  const [chosenMethod, setChosenMethod] = useState('')

  const paymentOptions: { label: string; bank: string; method: string }[] = []
  for (const acc of (profile.bank_accounts || [])) {
    paymentOptions.push({ label: `${acc.bank} · Débito`, bank: acc.bank, method: 'débito' })
  }
  for (const card of (profile.credit_cards || [])) {
    paymentOptions.push({ label: `${card.bank} · ${card.name}`, bank: card.bank, method: `crédito ${card.name}` })
  }

  const doMark = async (type: 'inc' | 'exp', idx: number) => {
    if (paymentOptions.length > 0) {
      setBankSelect({ type, idx })
      setChosenBank('')
      setChosenMethod('')
    } else {
      setMarking(`${type}_${idx}`)
      await onMarkFixed(type, idx)
      setMarking(null)
    }
  }

  const confirmMark = async () => {
    if (!bankSelect) return
    setMarking(`${bankSelect.type}_${bankSelect.idx}`)
    setBankSelect(null)
    await onMarkFixed(bankSelect.type, bankSelect.idx, chosenBank || undefined, chosenMethod || undefined)
    setMarking(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f0f0ed' }}>
      <div style={{ padding: '20px 16px 12px', background: '#fff', borderBottom: '1px solid #e2e2de' }}>
        <div style={{ fontSize: 17, fontWeight: 600 }}>Compromisos fijos</div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Marca los que ya recibiste o pagaste</div>
      </div>

      {/* Bank picker modal */}
      {bankSelect && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: '#fff', width: '100%', borderRadius: '20px 20px 0 0', padding: '20px 16px 32px' }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>¿Con qué {bankSelect.type === 'inc' ? 'recibiste este ingreso' : 'pagaste este gasto'}?</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Selecciona el banco y tipo de producto</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {paymentOptions.map((opt, i) => {
                const active = chosenBank === opt.bank && chosenMethod === opt.method
                return (
                  <button key={i} onClick={() => { setChosenBank(opt.bank); setChosenMethod(opt.method) }}
                    style={{ padding: '12px 16px', borderRadius: 12, border: `1.5px solid ${active ? '#1a1a1a' : '#e2e2de'}`, background: active ? '#1a1a1a' : '#f7f7f4', color: active ? '#fff' : '#333', fontSize: 13, fontWeight: 500, textAlign: 'left', cursor: 'pointer' }}>
                    {opt.label}
                  </button>
                )
              })}
              <button onClick={() => { setChosenBank(''); setChosenMethod('') }}
                style={{ padding: '12px 16px', borderRadius: 12, border: `1.5px solid ${!chosenBank ? '#1a1a1a' : '#e2e2de'}`, background: !chosenBank ? '#1a1a1a' : '#f7f7f4', color: !chosenBank ? '#fff' : '#333', fontSize: 13, fontWeight: 500, textAlign: 'left', cursor: 'pointer' }}>
                Sin especificar
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setBankSelect(null)} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
              <button onClick={confirmMark} className="btn-primary" style={{ flex: 1 }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 scrollable" style={{ padding: '14px 16px' }}>

        {profile.incomes.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Ingresos fijos</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {profile.incomes.map((inc, i) => {
                const done = !!ml[`inc_${i}`]
                const isMarking = marking === `inc_${i}`
                const sc = stabColor[inc.stability] || stabColor.media
                const sl = stabLabel[inc.stability] || 'Variable'
                return (
                  <div key={i} style={{ padding: '14px', borderBottom: i < profile.incomes.length - 1 ? '1px solid #f0f0ed' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{inc.name}</span>
                          <span className={`tag ${sc}`} style={{ fontSize: 10 }}>{sl}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#888', lineHeight: 1.5 }}>
                          {inc.description}
                          {inc.day_of_month && <span> · Día {inc.day_of_month}</span>}
                        </div>
                        {inc.notes && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{inc.notes}</div>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>+{fmt(inc.amount)}</span>
                        <button onClick={() => !done && !isMarking && doMark('inc', i)}
                          disabled={done || isMarking}
                          style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: done ? 'default' : 'pointer', border: 'none', background: done ? '#dcfce7' : '#f0f0ed', color: done ? '#16a34a' : '#555' }}>
                          {isMarking ? '...' : done ? '✓ Recibido' : 'Marcar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {profile.fixed_expenses.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Gastos fijos</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {profile.fixed_expenses.map((exp, i) => {
                const done = !!ml[`exp_${i}`]
                const isMarking = marking === `exp_${i}`
                const vl = varLabel[exp.variance] || ''
                return (
                  <div key={i} style={{ padding: '14px', borderBottom: i < profile.fixed_expenses.length - 1 ? '1px solid #f0f0ed' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{exp.name}</div>
                        <div style={{ fontSize: 11, color: '#888', lineHeight: 1.5 }}>
                          {exp.category}
                          {exp.day_of_month && <span> · Día {exp.day_of_month}</span>}
                          {vl && <span> · {vl}</span>}
                        </div>
                        {exp.variance_notes && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{exp.variance_notes}</div>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>-{fmt(exp.amount)}</span>
                        <button onClick={() => !done && !isMarking && doMark('exp', i)}
                          disabled={done || isMarking}
                          style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: done ? 'default' : 'pointer', border: 'none', background: done ? '#dcfce7' : '#f0f0ed', color: done ? '#16a34a' : '#555' }}>
                          {isMarking ? '...' : done ? '✓ Pagado' : 'Pagar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {profile.debts.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Deudas activas</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {profile.debts.map((d, i) => (
                <div key={i} style={{ padding: '14px', borderBottom: i < profile.debts.length - 1 ? '1px solid #f0f0ed' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>
                        {d.institution}
                        {d.months_remaining && <span> · {d.months_remaining} cuotas restantes</span>}
                        {d.interest_rate && <span> · {d.interest_rate}% tasa</span>}
                      </div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>Total pendiente: {fmt(d.total_amount)}</div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', whiteSpace: 'nowrap' }}>-{fmt(d.monthly_payment)}/mes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {profile.investments.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Inversiones y ahorro</div>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {profile.investments.map((inv, i) => (
                <div key={i} style={{ padding: '14px', borderBottom: i < profile.investments.length - 1 ? '1px solid #f0f0ed' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{inv.name}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{inv.type}{inv.monthly_contribution ? ` · Aporte: ${fmt(inv.monthly_contribution)}/mes` : ''}</div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{fmt(inv.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {profile.incomes.length === 0 && profile.fixed_expenses.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', fontSize: 13, color: '#aaa' }}>No hay ítems fijos configurados</div>
        )}
      </div>
    </div>
  )
}
