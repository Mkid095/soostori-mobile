import type { CartItem, ShopSettings, Sale } from '../lib/types'

export interface ReceiptData {
  shopName: string
  shopAddress?: string
  shopPhone?: string
  receiptNumber: string
  date: string
  items: { name: string; quantity: number; unitPrice: number; total: number; variation?: string }[]
  subtotal: number
  discount: number
  total: number
  paymentMethod: string
  footerMessage?: string
}

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const methodLabel = (m: string): string => {
  if (m === 'cash') return 'Cash'
  if (m === 'debt') return 'Debt'
  if (m === 'mpesa' || m === 'mobile_money') return 'M-Pesa'
  return m
}

export function buildReceiptData(
  cart: CartItem[],
  shopSettings: ShopSettings | null | undefined,
  paymentMethod: Sale['paymentMethod'],
  receiptNumber?: string,
): ReceiptData {
  const subtotal = cart.reduce((s, i) => s + i.totalPrice, 0)
  return {
    shopName: shopSettings?.name ?? 'My Shop',
    shopAddress: shopSettings?.address,
    shopPhone: shopSettings?.phone,
    receiptNumber: receiptNumber ?? `T-${Date.now()}`,
    date: formatDate(new Date()),
    items: cart.map((i) => ({
      name: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.totalPrice,
      variation: i.variationName,
    })),
    subtotal,
    discount: 0,
    total: subtotal,
    paymentMethod: methodLabel(paymentMethod),
    footerMessage: shopSettings?.receiptFooter,
  }
}

export function generateReceiptHTML(data: ReceiptData): string {
  const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const items = data.items
    .map((i) => `<tr><td>${esc(i.name)}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">${i.total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td></tr>`)
    .join('')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Receipt</title>
<style>
body{font-family:monospace;font-size:12px;color:#000;padding:0;margin:0;width:280px;background:#fff}
.center{text-align:center}
.bold{font-weight:700}
.big{font-size:16px;font-weight:700}
.divider{border-top:1px dashed #000;margin:6px 0}
table{width:100%;border-collapse:collapse}
td{padding:2px 4px;vertical-align:top}
.footer{margin-top:8px;text-align:center;font-size:10px;color:#666}
</style></head><body>
<div class="center bold">${esc(data.shopName)}</div>
${data.shopAddress ? `<div class="center" style="font-size:10px">${esc(data.shopAddress)}</div>` : ''}
${data.shopPhone ? `<div class="center" style="font-size:10px">${esc(data.shopPhone)}</div>` : ''}
<div class="divider"></div>
<div class="center big">RECEIPT</div>
<div class="divider"></div>
<div>No: ${esc(data.receiptNumber)}</div>
<div>Date: ${esc(data.date)}</div>
<div class="divider"></div>
<table>
<tr><td><b>Item</b></td><td style="text-align:center"><b>Qty</b></td><td style="text-align:right"><b>Total</b></td></tr>
${items}
</table>
<div class="divider"></div>
<div style="display:flex;justify-content:space-between"><span>Subtotal:</span><span>${data.subtotal.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span></div>
${data.discount > 0 ? `<div style="display:flex;justify-content:space-between"><span>Discount:</span><span>-${data.discount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</span></div>` : ''}
<div class="bold big" style="text-align:right">KES ${data.total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}</div>
<div style="text-align:right">Paid by: ${esc(data.paymentMethod)}</div>
<div class="divider"></div>
${data.footerMessage ? `<div class="footer">${esc(data.footerMessage)}</div>` : ''}
<div class="footer">Thank you for your purchase!</div>
</body></html>`
}
