'use client'
import type { Profile } from '@/lib/types'
import { fmt, stabLabel, stabColor, varLabel } from '@/lib/utils'

interface Props {
  profile: Profile
  onMarkFixed: (type: 'inc' | 'exp', idx: number) => Promise<void>
}

export default function Fixed({ profile, onMarkFixed }: Props) {
  const mk = new Date().toISOString().substring(0, 7)
  const ml = profile.monthly_log?.[mk] || {}

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-2">
        <div className="text-lg font-semibold">Compromisos fijos</div>
        <div className="text-xs text-gray-400 mt-0.5">Marca los que ya recibiste o pagaste</div>
      </div>

      <div className="flex-1 scrollable px-4 pb-4">

        {/* Ingresos fijos */}
        {profile.incomes.length > 0 && (
          <div className="mb-5">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Ingresos fijos mensuales</div>
            <div className="border border-gray-100 rounded-2xl divide-y divide-gray-50">
              {profile.incomes.map((inc, i) => {
                const done = !!ml[`inc_${i}`]
                const sc = stabColor[inc.stability] || stabColor.media
                const sl = stabLabel[inc.stability] || 'Variable'
                return (
                  <div key={i} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{inc.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc}`}>{sl}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 leading-relaxed">
                          {inc.description}
                          {inc.day_of_month && <span> · Llega el día {inc.day_of_month}</span>}
                        </div>
                        {inc.notes && <div className="text-xs text-gray-400 mt-0.5">{inc.notes}</div>}
                        <div className="flex gap-3 mt-1 text-xs text-gray-400">
                          {inc.growth_probability && <span>Crecimiento: {inc.growth_probability}</span>}
                          {inc.loss_risk && <span>Riesgo pérdida: {inc.loss_risk}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="text-sm font-semibold text-green-600">+{fmt(inc.amount)}</span>
                        <button
                          onClick={() => !done && onMarkFixed('inc', i)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                            done
                              ? 'bg-green-100 text-green-700 cursor-default'
                              : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                          }`}
                        >
                          {done ? '✓ Recibido' : 'Marcar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Gastos fijos */}
        {profile.fixed_expenses.length > 0 && (
          <div className="mb-5">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Gastos fijos mensuales</div>
            <div className="border border-gray-100 rounded-2xl divide-y divide-gray-50">
              {profile.fixed_expenses.map((exp, i) => {
                const done = !!ml[`exp_${i}`]
                const vl = varLabel[exp.variance] || ''
                return (
                  <div key={i} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{exp.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {exp.category}
                          {exp.day_of_month && <span> · Día {exp.day_of_month}</span>}
                          {vl && <span> · {vl}</span>}
                        </div>
                        {exp.variance_notes && <div className="text-xs text-gray-400 mt-0.5">{exp.variance_notes}</div>}
                        {exp.notes && <div className="text-xs text-gray-400 mt-0.5">{exp.notes}</div>}
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <span className="text-sm font-semibold text-red-500">-{fmt(exp.amount)}</span>
                        <button
                          onClick={() => !done && onMarkFixed('exp', i)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                            done
                              ? 'bg-green-100 text-green-700 cursor-default'
                              : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                          }`}
                        >
                          {done ? '✓ Pagado' : 'Pagar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Deudas */}
        {profile.debts.length > 0 && (
          <div className="mb-5">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Deudas activas</div>
            <div className="border border-gray-100 rounded-2xl divide-y divide-gray-50">
              {profile.debts.map((d, i) => (
                <div key={i} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="text-sm font-medium">{d.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {d.institution}
                        {d.months_remaining && <span> · {d.months_remaining} cuotas restantes</span>}
                        {d.interest_rate && <span> · {d.interest_rate}% tasa</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">Pendiente total: {fmt(d.total_amount)}</div>
                    </div>
                    <span className="text-sm font-semibold text-red-500 whitespace-nowrap">-{fmt(d.monthly_payment)}/mes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inversiones */}
        {profile.investments.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Inversiones y ahorro</div>
            <div className="border border-gray-100 rounded-2xl divide-y divide-gray-50">
              {profile.investments.map((inv, i) => (
                <div key={i} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="text-sm font-medium">{inv.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {inv.type}
                        {inv.monthly_contribution && <span> · Aporte mensual: {fmt(inv.monthly_contribution)}</span>}
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{fmt(inv.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {profile.incomes.length === 0 && profile.fixed_expenses.length === 0 && (
          <div className="text-center py-16 text-sm text-gray-400">No hay ítems fijos configurados</div>
        )}
      </div>
    </div>
  )
}
