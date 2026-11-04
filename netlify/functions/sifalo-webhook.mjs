// POST /api/sifalo-webhook  (Sifalo pushes here when a payment finishes)
// We never trust the push alone: we re-verify the sid with Sifalo and log the result.
import { verify, json } from '../lib/sifalo.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ ok: true });
  let body = {}; try { body = await req.json(); } catch { try { body = Object.fromEntries(new URLSearchParams(await req.text())); } catch {} }
  const sid = body.sid || body.SID;
  if (sid) {
    try { const v = await verify(sid); console.log('[webhook] verified', sid, v.status, v.code, v.amount, v.payment_type); }
    catch (e) { console.error('[webhook] verify failed', sid, e.message); }
  } else {
    console.log('[webhook] received without sid', JSON.stringify(body).slice(0, 500));
  }
  return json({ ok: true });
};
export const config = { path: '/api/sifalo-webhook' };
