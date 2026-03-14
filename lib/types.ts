export interface Income {
  name: string
  description: string
  amount: number
  day_of_month: number | null
  stability: 'alta' | 'media' | 'baja'
  growth_probability: 'alta' | 'media' | 'baja'
  loss_risk: 'alta' | 'media' | 'baja'
  notes: string
}

export interface FixedExpense {
  name: string
  category: string
  amount: number
  variance: 'fija' | 'baja' | 'media' | 'alta'
  variance_notes: string
  day_of_month: number | null
  notes: string
}

export interface Debt {
  name: string
  institution: string
  monthly_payment: number
  total_amount: number
  months_remaining: number | null
  interest_rate: number | null
}

export interface Investment {
  name: string
  amount: number
  type: string
  monthly_contribution: number | null
}

export interface Profile {
  id?: string
  user_id?: string
  current_balance: number
  incomes: Income[]
  fixed_expenses: FixedExpense[]
  debts: Debt[]
  investments: Investment[]
  monthly_log: Record<string, Record<string, boolean>>
  created_at?: string
}

export interface Transaction {
  id?: string
  user_id?: string
  type: 'income' | 'expense'
  amount: number
  category: string
  description: string
  date: string
  created_at?: string
}

export interface Goal {
  id?: string
  user_id?: string
  name: string
  target: number
  current: number
  created_at?: string
}

export type Tab = 'dashboard' | 'register' | 'fixed' | 'goals'
