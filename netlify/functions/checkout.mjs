// POST /api/checkout  { product: "dv-photo" | "website-starter" | ... }
// Creates a Sifalo hosted-checkout session and returns the URL to send the customer to.
import { PRODUCTS, startCheckout, json } from '../lib/sifalo.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  let body = {}; try { body = await req.json(); } catch {}
  const product = PRODUCTS[body.product];
  if (!product) return json({ error: 'Unknown product' }, 400);
  const site = process.env.URL || new URL(req.url).origin;
  const orderId = `${body.product}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const returnUrl = `${site}/api/return?order_id=${encodeURIComponent(orderId)}&product=${encodeURIComponent(body.product)}`;
  try {
    const url = await startCheckout({ amount: product.amount, returnUrl, webhookUrl: `${site}/api/sifalo-webhook` });
    console.log('[checkout] started', orderId, product.amount);
    return json({ url, orderId });
  } catch (e) {
    console.error('[checkout] failed', orderId, e.message);
    return json({ error: 'Payment could not be started. Please try again in a minute.' }, 502);
  }
};
export const config = { path: '/api/checkout' };
