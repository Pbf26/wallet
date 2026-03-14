export const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n)

export const today = () => new Date().toISOString().split('T')[0]

export const monthKey = () => today().substring(0, 7)

export const fmtDate = (s: string) =>
  new Date(s + 'T12:00').toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
  })

export const catColor: Record<string, string> = {
  Alimentación: '#c9a84c',
  Transporte: '#4a90d9',
  Vivienda: '#7b68ee',
  Salud: '#e07878',
  Entretenimiento: '#e8934a',
  Ropa: '#c84b9e',
  Educación: '#4ab3c8',
  'Servicios básicos': '#5b8af0',
  Tecnología: '#5b8af0',
  Restaurantes: '#d4614f',
  Sueldo: '#4db388',
  Freelance: '#4db388',
  Inversión: '#6db34a',
  Arriendo: '#c9a84c',
  Ahorro: '#4db388',
  Deudas: '#e24b4a',
  Seguros: '#7b68ee',
  'Balance inicial': '#888888',
  'Otros ingresos': '#4db388',
  Otros: '#888888',
}

export const cc = (cat: string) => catColor[cat] || '#888888'

export const stabLabel: Record<string, string> = {
  alta: 'Estable',
  media: 'Variable',
  baja: 'Inestable',
}

export const stabColor: Record<string, string> = {
  alta: 'bg-green-100 text-green-700',
  media: 'bg-yellow-100 text-yellow-700',
  baja: 'bg-red-100 text-red-700',
}

export const varLabel: Record<string, string> = {
  fija: 'Sin variación',
  baja: 'Poca variación',
  media: 'Variación moderada',
  alta: 'Alta variación',
}
