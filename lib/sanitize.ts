import type { Profile } from './types'

// Ensure all numeric fields are actual numbers, never NaN/null/undefined
export function sanitizeProfile(p: Profile): Profile {
  const n = (v: unknown, fallback = 0): number => {
    const num = parseFloat(String(v))
    return isNaN(num) ? fallback : num
  }

  return {
    ...p,
    current_balance: n(p.current_balance),
    bank_accounts: (p.bank_accounts || []).map(a => ({
      ...a,
      balance: n(a.balance),
    })),
    credit_cards: (p.credit_cards || []).map(c => ({
      ...c,
      limit: n(c.limit),
      used: n(c.used),
      payment_day: c.payment_day != null ? n(c.payment_day) : null,
      pays_full: !!c.pays_full,
    })),
    incomes: (p.incomes || []).map(i => ({
      ...i,
      amount: n(i.amount),
      day_of_month: i.day_of_month != null ? n(i.day_of_month) : null,
      stability: i.stability || 'media',
      growth_probability: i.growth_probability || 'media',
      loss_risk: i.loss_risk || 'media',
      notes: i.notes || '',
    })),
    fixed_expenses: (p.fixed_expenses || []).map(e => ({
      ...e,
      amount: n(e.amount),
      day_of_month: e.day_of_month != null ? n(e.day_of_month) : null,
      variance: e.variance || 'baja',
      variance_notes: e.variance_notes || '',
      notes: e.notes || '',
    })),
    debts: (p.debts || []).map(d => ({
      ...d,
      monthly_payment: n(d.monthly_payment),
      total_amount: n(d.total_amount),
      months_remaining: d.months_remaining != null ? n(d.months_remaining) : null,
      interest_rate: d.interest_rate != null ? n(d.interest_rate) : null,
    })),
    investments: (p.investments || []).map(i => ({
      ...i,
      amount: n(i.amount),
      monthly_contribution: i.monthly_contribution != null ? n(i.monthly_contribution) : null,
    })),
    monthly_log: p.monthly_log || {},
  }
}
