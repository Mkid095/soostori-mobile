// rep.* — Reports screen strings
type Table = Record<string, string>

export const rep: { en: Table; sw: Table } = {
  en: {
    'rep.title': 'Reports',
    'rep.today': 'Today',
    'rep.thisWeek': 'This Week',
    'rep.allTime': 'All Time',
    'rep.total': 'Total',
    'rep.cash': 'Cash',
    'rep.mpesa': 'M-Pesa',
    'rep.debt': 'Debt',
    'rep.noSales': 'No sales found',
    'rep.sales': 'sales',
  },
  sw: {
    'rep.title': 'Ripoti',
    'rep.today': 'Leo',
    'rep.thisWeek': 'Wiki Hii',
    'rep.allTime': 'Muda Wote',
    'rep.total': 'Jumla',
    'rep.cash': 'Pesa Taslimu',
    'rep.mpesa': 'M-Pesa',
    'rep.debt': 'Deni',
    'rep.noSales': 'Hakuna mauzo',
    'rep.sales': 'mauzo',
  },
}
