// nav.* — top-level navigation labels
type Table = Record<string, string>

export const nav: { en: Table; sw: Table } = {
  en: {
    'nav.pos': 'Point of Sale',
    'nav.inventory': 'Stock',
    'nav.reports': 'Reports',
    'nav.debts': 'Debt',
    'nav.settings': 'Settings',
  },
  sw: {
    'nav.pos': 'Duka la Mauzo',
    'nav.inventory': 'Hisa za Bidhaa',
    'nav.reports': 'Ripoti',
    'nav.debts': 'Deni',
    'nav.settings': 'Mipangilio',
  },
}
