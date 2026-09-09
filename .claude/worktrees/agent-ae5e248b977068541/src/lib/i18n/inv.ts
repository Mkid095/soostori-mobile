// inv.* — Inventory screen strings
type Table = Record<string, string>

export const inv: { en: Table; sw: Table } = {
  en: {
    'inv.title': 'Stock',
    'inv.searchProducts': 'Search products...',
    'inv.addProduct': 'Add Product',
    'inv.productName': 'Product Name',
    'inv.barcode': 'Barcode',
    'inv.sellPrice': 'Sell Price',
    'inv.cost': 'Cost',
    'inv.stock': 'Stock',
    'inv.lowStockAlert': 'Low Stock Alert',
    'inv.noProducts': 'No products yet',
    'inv.saveProduct': 'Save Product',
    'inv.cancel': 'Cancel',
    'inv.delete': 'Delete',
    'inv.required': 'Required',
  },
  sw: {
    'inv.title': 'Hisa za Bidhaa',
    'inv.searchProducts': 'Tafuta bidhaa...',
    'inv.addProduct': 'Ongeza Bidhaa',
    'inv.productName': 'Jina la Bidhaa',
    'inv.barcode': 'Barcode',
    'inv.sellPrice': 'Bei ya Kuuza',
    'inv.cost': 'Gharama',
    'inv.stock': 'Hisa',
    'inv.lowStockAlert': 'Tahadhari ya Hisa',
    'inv.noProducts': 'Bado hakuna bidhaa',
    'inv.saveProduct': 'Hifadhi Bidhaa',
    'inv.cancel': 'Ghairi',
    'inv.delete': 'Futa',
    'inv.required': 'Inahitajika',
  },
}
