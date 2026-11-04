// GET /api/verify?sid=..&product=..  -> { paid: true|false }  (used by pages to unlock downloads)
import { PRODUCTS, verify, json } from '../lib/sifalo.mjs';

export default async (req) => {
  const u = new URL(req.url);
  const sid = u.searchParams.get('sid'), product = u.searchParams.get('product');
  if (!sid || !PRODUCTS[product]) return json({ paid: false, error: 'missing sid or product' }, 400);
  try {
    const v = await verify(sid);
    return json({ paid: v.paid && Number(v.amount) >= Number(PRODUCTS[product].amount), status: v.status, payment_type: v.payment_type });
  } catch (e) {
    return json({ paid: false, error: 'verify failed' }, 502);
  }
};
export const config = { path: '/api/verify' };
