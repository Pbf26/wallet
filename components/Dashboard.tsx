'use client'
import type { Profile, Transaction, Goal } from '@/lib/types'
import { fmt, fmtDate, cc } from '@/lib/utils'

interface Props {
  profile: Profile
  transactions: Transaction[]
  goals: Goal[]
  onSignOut: () => void
}

export default function Dashboard({ profile, transactions, goals, onSignOut }: Props) {
  const mk = new Date().toISOString().substring(0, 7)
  const monthTxns = transactions.filter((t) => t.date.startsWith(mk))
  const income = monthTxns.filter((t) => t.type === 'income' && t.category !== 'Balance inicial').reduce((s, t) => s + t.amount, 0)
  const expense = monthTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const ml = profile.monthly_log?.[mk] || {}

  const totalCash = (profile.bank_accounts || []).reduce((s, a) => s + a.balance, 0)
  const totalDebt = (profile.debts || []).reduce((s, d) => s + d.total_amount, 0)
  const totalCardUsed = (profile.credit_cards || []).reduce((s, c) => s + c.used, 0)
  const totalOwed = totalDebt + totalCardUsed
  const netBalance = totalCash - totalOwed

  const fInc = profile.incomes.reduce((s, i) => s + i.amount, 0)
  const fExp = profile.fixed_expenses.reduce((s, e) => s + e.amount, 0)
  const fIncDone = profile.incomes.filter((_, i) => ml[`inc_${i}`]).reduce((s, i) => s + i.amount, 0)
  const fExpDone = profile.fixed_expenses.filter((_, i) => ml[`exp_${i}`]).reduce((s, e) => s + e.amount, 0)
  const recent = transactions.filter((t) => t.category !== 'Balance inicial').slice(0, 10)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f0f0ed' }}>
      <div style={{ padding: '20px 16px 12px', background: '#fff', borderBottom: '1px solid #e2e2de', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 600 }}>Resumen</div>
        <button onClick={onSignOut} style={{ fontSize: 12, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}>Salir</button>
      </div>

      <div className="flex-1 scrollable" style={{ padding: '16px' }}>

        {/* Balance trio */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div style={{ textAlign: 'center', padding: '10px 4px' }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>En cash</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#16a34a' }}>{fmt(totalCash)}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px 4px', borderLeft: '1px solid #e2e2de', borderRight: '1px solid #e2e2de' }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Debes</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: totalOwed > 0 ? '#dc2626' : '#888' }}>{fmt(totalOwed)}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px 4px' }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Neto real</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: netBalance >= 0 ? '#1a1a1a' : '#dc2626' }}>{fmt(netBalance)}</div>
            </div>
          </div>
        </div>

        {/* Month */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div className="card" style={{ margin: 0, textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: 11, color: '#16a34a', marginBottom: 4 }}>Ingresos del mes</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#16a34a' }}>{fmt(income)}</div>
          </div>
          <div className="card" style={{ margin: 0, textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: 11, color: '#dc2626', marginBottom: 4 }}>Gastos del mes</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#dc2626' }}>{fmt(expense)}</div>
          </div>
        </div>

        {/* Fixed progress */}
        {(fInc > 0 || fExp > 0) && (
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Compromisos del mes</div>
            {fInc > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: '#555' }}>Ingresos recibidos</span>
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>{fmt(fIncDone)} / {fmt(fInc)}</span>
                </div>
                <div style={{ height: 6, background: '#e2e2de', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#16a34a', borderRadius: 4, width: fInc > 0 ? Math.round(fIncDone / fInc * 100) + '%' : '0%' }} />
                </div>
              </div>
            )}
            {fExp > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: '#555' }}>Gastos pagados</span>
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>{fmt(fExpDone)} / {fmt(fExp)}</span>
                </div>
                <div style={{ height: 6, background: '#e2e2de', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#dc2626', borderRadius: 4, width: fExp > 0 ? Math.round(fExpDone / fExp * 100) + '%' : '0%' }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Goals preview */}
        {goals.length > 0 && (
          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Metas</div>
            {goals.slice(0, 3).map((g) => {
              const pct = Math.min(100, Math.round(g.current / g.target * 100))
              return (
                <div key={g.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                    <span style={{ fontWeight: 500 }}>{g.name}</span>
                    <span style={{ color: '#888' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, background: '#e2e2de', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 4, background: pct >= 100 ? '#16a34a' : '#1a1a1a', width: pct + '%' }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>{fmt(g.current)} de {fmt(g.target)}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Recent transactions */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Últimos movimientos</div>
          {recent.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', fontSize: 13, color: '#aaa' }}>Sin transacciones aún</div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {recent.map((t, i) => {
                const col = cc(t.category)
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < recent.length - 1 ? '1px solid #f0f0ed' : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0, background: col + '22', color: col }}>
                      {t.category[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>
                      <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
                        {t.category}{t.bank ? ` · ${t.bank}` : ''}{t.payment_method ? ` ${t.payment_method}` : ''} · {fmtDate(t.date)}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', color: t.type === 'income' ? '#16a34a' : '#dc2626' }}>
                      {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
