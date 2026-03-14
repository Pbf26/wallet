'use client'
import type { Profile, Transaction, Goal } from '@/lib/types'
import { fmt, fmtDate, cc, stabLabel, stabColor, varLabel } from '@/lib/utils'

interface Props {
  profile: Profile
  transactions: Transaction[]
  goals: Goal[]
  onSignOut: () => void
}

export default function Dashboard({ profile, transactions, goals, onSignOut }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const mk = today.substring(0, 7)
  const monthTxns = transactions.filter((t) => t.date.startsWith(mk))
  const income = monthTxns.filter((t) => t.type === 'income' && t.category !== 'Balance inicial').reduce((s, t) => s + t.amount, 0)
  const expense = monthTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = transactions.reduce((s, t) => t.type === 'income' ? s + t.amount : s - t.amount, 0)
  const ml = profile.monthly_log?.[mk] || {}
  const fInc = profile.incomes.reduce((s, i) => s + i.amount, 0)
  const fExp = profile.fixed_expenses.reduce((s, e) => s + e.amount, 0)
  const fIncDone = profile.incomes.filter((_, i) => ml[`inc_${i}`]).reduce((s, i) => s + i.amount, 0)
  const fExpDone = profile.fixed_expenses.filter((_, i) => ml[`exp_${i}`]).reduce((s, e) => s + e.amount, 0)
  const recent = transactions.filter((t) => t.category !== 'Balance inicial').slice(0, 10)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-5 pb-2">
        <div className="text-lg font-semibold">Resumen</div>
        <button onClick={onSignOut} className="text-xs text-gray-400">Salir</button>
      </div>

      <div className="flex-1 scrollable px-4 pb-4">
        {/* Balance */}
        <div className="text-center py-6">
          <div className="text-xs text-gray-400 mb-1">Balance total</div>
          <div className={`text-4xl font-semibold ${balance >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
            {fmt(balance)}
          </div>
        </div>

        {/* Month summary */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-green-50 rounded-2xl p-4">
            <div className="text-xs text-green-600 mb-1">Ingresos del mes</div>
            <div className="text-lg font-semibold text-green-700">{fmt(income)}</div>
          </div>
          <div className="bg-red-50 rounded-2xl p-4">
            <div className="text-xs text-red-500 mb-1">Gastos del mes</div>
            <div className="text-lg font-semibold text-red-600">{fmt(expense)}</div>
          </div>
        </div>

        {/* Fixed progress */}
        {(fInc > 0 || fExp > 0) && (
          <div className="border border-gray-100 rounded-2xl p-4 mb-5">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Compromisos del mes</div>
            {fInc > 0 && (
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-500">Ingresos recibidos</span>
                  <span className="text-green-600 font-medium">{fmt(fIncDone)} / {fmt(fInc)}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-400 rounded-full" style={{ width: fInc > 0 ? Math.round(fIncDone / fInc * 100) + '%' : '0%' }} />
                </div>
              </div>
            )}
            {fExp > 0 && (
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-500">Gastos pagados</span>
                  <span className="text-red-500 font-medium">{fmt(fExpDone)} / {fmt(fExp)}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-400 rounded-full" style={{ width: fExp > 0 ? Math.round(fExpDone / fExp * 100) + '%' : '0%' }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Goals preview */}
        {goals.length > 0 && (
          <div className="mb-5">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Metas</div>
            <div className="border border-gray-100 rounded-2xl divide-y divide-gray-50">
              {goals.slice(0, 3).map((g) => {
                const pct = Math.min(100, Math.round(g.current / g.target * 100))
                return (
                  <div key={g.id} className="p-4">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium">{g.name}</span>
                      <span className="text-gray-500">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pct >= 100 ? 'bg-green-400' : 'bg-black'}`} style={{ width: pct + '%' }} />
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{fmt(g.current)} de {fmt(g.target)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent transactions */}
        <div>
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Últimos movimientos</div>
          {recent.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">Sin transacciones aún</div>
          ) : (
            <div className="border border-gray-100 rounded-2xl divide-y divide-gray-50">
              {recent.map((t) => {
                const col = cc(t.category)
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: col + '22', color: col }}>
                      {t.category[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{t.description}</div>
                      <div className="text-xs text-gray-400">{t.category} · {fmtDate(t.date)}</div>
                    </div>
                    <div className={`text-sm font-semibold whitespace-nowrap ${t.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
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
