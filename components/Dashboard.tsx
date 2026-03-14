'use client'
import { useState } from 'react'
import type { Profile, Transaction, Goal } from '@/lib/types'
import { fmt, fmtDate, cc } from '@/lib/utils'
import PatrimonyWidget from './PatrimonyWidget'
import EditTransactionModal from './EditTransactionModal'

interface Props {
  profile: Profile
  transactions: Transaction[]
  goals: Goal[]
  onSignOut: () => void
  onUpdateTransaction: (t: Transaction) => Promise<void>
  onDeleteTransaction: (id: string) => Promise<void>
}

export default function Dashboard({ profile, transactions, goals, onSignOut, onUpdateTransaction, onDeleteTransaction }: Props) {
  const [editTxn, setEditTxn] = useState<Transaction | null>(null)
  const mk = new Date().toISOString().substring(0, 7)
  const monthTxns = transactions.filter(t => t.date.startsWith(mk))
  const income = monthTxns.filter(t => t.type === 'income' && t.category !== 'Balance inicial').reduce((s, t) => s + t.amount, 0)
  const expense = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const ml = profile.monthly_log?.[mk] || {}

  const totalCash = transactions.reduce((s, t) => t.type === 'income' ? s + t.amount : s - t.amount, 0)
  const totalDebt = (profile.debts || []).reduce((s, d) => s + d.total_amount, 0)
  const totalCardUsed = (profile.credit_cards || []).reduce((s, c) => s + c.used, 0)
  const totalOwed = totalDebt + totalCardUsed
  const netBalance = totalCash - totalOwed

  const fInc = profile.incomes.reduce((s, i) => s + i.amount, 0)
  const fExp = profile.fixed_expenses.reduce((s, e) => s + e.amount, 0)
  const fIncDone = profile.incomes.filter((_, i) => { const e = ml[`inc_${i}`]; return e && (typeof e === 'boolean' ? e : e.paid) }).reduce((s, i) => s + i.amount, 0)
  const fExpDone = profile.fixed_expenses.filter((_, i) => { const e = ml[`exp_${i}`]; return e && (typeof e === 'boolean' ? e : e.paid) }).reduce((s, e) => s + e.amount, 0)
  const recent = transactions.filter(t => t.category !== 'Balance inicial').slice(0, 15)

  const bankBalances: Record<string, number> = {}
  for (const acc of (profile.bank_accounts || [])) bankBalances[acc.bank] = 0
  for (const txn of transactions) {
    if (txn.bank) {
      if (!(txn.bank in bankBalances)) bankBalances[txn.bank] = 0
      bankBalances[txn.bank] += txn.type === 'income' ? txn.amount : -txn.amount
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f0f0ed' }}>
      {editTxn && (
        <EditTransactionModal txn={editTxn} profile={profile}
          onSave={async (t) => { await onUpdateTransaction(t); setEditTxn(null) }}
          onDelete={async (id) => { await onDeleteTransaction(id); setEditTxn(null) }}
          onClose={() => setEditTxn(null)} />
      )}

      <div style={{ padding: '20px 16px 12px', background: '#fff', borderBottom: '1px solid #e2e2de', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 600 }}>Resumen</div>
        <button onClick={onSignOut} style={{ fontSize: 12, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}>Salir</button>
      </div>

      <div className="flex-1 scrollable" style={{ padding: '14px 16px' }}>

        {/* Patrimony */}
        <PatrimonyWidget profile={profile} transactions={transactions} />

        {/* Balance trio */}
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
            <div style={{ textAlign: 'center', padding: '10px 6px' }}>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 4, fontWeight: 500 }}>EN CASH</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: totalCash >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(totalCash)}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px 6px', borderLeft: '1px solid #e2e2de', borderRight: '1px solid #e2e2de' }}>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 4, fontWeight: 500 }}>DEBES</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: totalOwed > 0 ? '#dc2626' : '#888' }}>{fmt(totalOwed)}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px 6px' }}>
              <div style={{ fontSize: 10, color: '#888', marginBottom: 4, fontWeight: 500 }}>NETO</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: netBalance >= 0 ? '#1a1a1a' : '#dc2626' }}>{fmt(netBalance)}</div>
            </div>
          </div>
        </div>

        {/* Per-bank */}
        {(profile.bank_accounts || []).length > 0 && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Saldo por banco</div>
            {(profile.bank_accounts || []).map((acc, i) => {
              const bal = bankBalances[acc.bank] ?? acc.balance
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, marginBottom: 8, borderBottom: i < profile.bank_accounts.length - 1 ? '1px solid #f0f0ed' : 'none' }}>
                  <div><div style={{ fontSize: 13, fontWeight: 500 }}>{acc.bank}</div><div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>{acc.account_type}</div></div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: bal >= 0 ? '#16a34a' : '#dc2626' }}>{fmt(bal)}</div>
                </div>
              )
            })}
          </div>
        )}

        {/* Month */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div className="card" style={{ margin: 0, padding: 14 }}>
            <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 500, marginBottom: 4 }}>INGRESOS DEL MES</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>{fmt(income)}</div>
          </div>
          <div className="card" style={{ margin: 0, padding: 14 }}>
            <div style={{ fontSize: 10, color: '#dc2626', fontWeight: 500, marginBottom: 4 }}>GASTOS DEL MES</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626' }}>{fmt(expense)}</div>
          </div>
        </div>

        {/* Fixed progress */}
        {(fInc > 0 || fExp > 0) && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Compromisos del mes</div>
            {fInc > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                  <span style={{ color: '#555' }}>Ingresos recibidos</span>
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>{fmt(fIncDone)} / {fmt(fInc)}</span>
                </div>
                <div style={{ height: 6, background: '#e2e2de', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#16a34a', borderRadius: 4, width: Math.round(fIncDone / fInc * 100) + '%' }} />
                </div>
              </div>
            )}
            {fExp > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                  <span style={{ color: '#555' }}>Gastos pagados</span>
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>{fmt(fExpDone)} / {fmt(fExp)}</span>
                </div>
                <div style={{ height: 6, background: '#e2e2de', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#dc2626', borderRadius: 4, width: Math.round(fExpDone / fExp * 100) + '%' }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Goals */}
        {goals.length > 0 && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Metas</div>
            {goals.slice(0, 3).map(g => {
              const pct = Math.min(100, Math.round(g.current / g.target * 100))
              return (
                <div key={g.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                    <span style={{ fontWeight: 500 }}>{g.name}</span><span style={{ color: '#888' }}>{pct}%</span>
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

        {/* Recent — tappable */}
        <div style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Movimientos · toca para editar</div>
        {recent.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', fontSize: 13, color: '#aaa' }}>Sin transacciones aún</div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {recent.map((t, i) => {
              const col = cc(t.category)
              return (
                <button key={t.id} onClick={() => setEditTxn(t)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: i < recent.length - 1 ? '1px solid #f0f0ed' : 'none', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, background: col + '22', color: col }}>
                    {t.category[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>
                      {t.category}{t.bank ? ` · ${t.bank}` : ''}{t.payment_method ? ` · ${t.payment_method}` : ''} · {fmtDate(t.date)}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', color: t.type === 'income' ? '#16a34a' : '#dc2626' }}>
                    {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
