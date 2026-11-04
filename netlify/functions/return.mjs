// GET /api/return?order_id=..&product=..&sid=..   (Sifalo sends the customer here after paying)
// Verifies the payment on the server, then sends the customer to the right page.
import { PRODUCTS, verify } from '../lib/sifalo.mjs';

export default async (req) => {
  const u = new URL(req.url);
  const sid = u.searchParams.get('sid'), product = u.searchParams.get('product'), orderId = u.searchParams.get('order_id');
  const go = (path) => Response.redirect(new URL(path, u.origin).toString(), 302);
  if (!sid || !PRODUCTS[product]) return go('/paid.html?status=missing');
  try {
    const v = await verify(sid);
    const okAmount = Number(v.amount) >= Number(PRODUCTS[product].amount);
    console.log('[return]', orderId, sid, v.status, v.code, v.amount, v.payment_type);
    if (v.paid && okAmount) {
      if (product === 'dv-photo') return go(`/dv-photo.html?paid=1&sid=${encodeURIComponent(sid)}`);
      return go(`/paid.html?status=ok&product=${encodeURIComponent(product)}&sid=${encodeURIComponent(sid)}`);
    }
    return go(`/paid.html?status=${encodeURIComponent(v.status)}&product=${encodeURIComponent(product)}&sid=${encodeURIComponent(sid)}`);
  } catch (e) {
    console.error('[return] verify failed', orderId, e.message);
    return go(`/paid.html?status=error&product=${encodeURIComponent(product)}&sid=${encodeURIComponent(sid)}`);
  }
};
export const config = { path: '/api/return' };
