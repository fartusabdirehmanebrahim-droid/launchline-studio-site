// Shared Sifalo Pay helpers. API keys come from Netlify environment variables only.
export const PRODUCTS = {
  'dv-photo':          { name: 'DV Lottery / US visa photo', amount: '2' },
  'website-starter':   { name: 'Starter Page website',       amount: '250' },
  'website-business':  { name: 'Business Page website',      amount: '450' },
  'care-plan':         { name: 'Care Plan (1 month)',        amount: '30' },
};

const LIVE = { gateway: 'https://api.sifalopay.com/gateway/', checkout: 'https://pay.sifalo.com/checkout/' };
const STAGING = { gateway: 'https://spay-api.sifalo.net/gateway/', checkout: 'https://pay.sifalo.net/checkout/' };
export const HOSTS = process.env.SIFALO_MODE === 'staging' ? STAGING : LIVE;

async function call(url, body, auth) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const user = process.env.SIFALO_API_USER, key = process.env.SIFALO_API_KEY;
    if (!user || !key) throw new Error('Sifalo API keys are not set in Netlify environment variables.');
    headers.Authorization = 'Basic ' + Buffer.from(`${user}:${key}`).toString('base64');
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return { status: res.status, data };
  } finally { clearTimeout(t); }
}

export async function startCheckout({ amount, returnUrl, webhookUrl }) {
  const r = await call(HOSTS.gateway, {
    amount, gateway: 'checkout', currency: 'USD', return_url: returnUrl, webhook_url: webhookUrl,
  }, true);
  if (!r.data || !r.data.key || !r.data.token) {
    throw new Error('Sifalo did not return a checkout session (HTTP ' + r.status + ').');
  }
  return `${HOSTS.checkout}?key=${encodeURIComponent(r.data.key)}&token=${encodeURIComponent(r.data.token)}`;
}

export async function verify(sid) {
  const r = await call(HOSTS.gateway + 'verify.php', { sid }, false);
  const d = r.data || {};
  return {
    paid: d.status === 'success' && Number(d.code) === 601,
    status: d.status || 'unknown', code: d.code ?? null,
    amount: d.amount ?? null, currency: d.currency ?? null, payment_type: d.payment_type ?? null, sid: d.sid ?? sid,
  };
}

export const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
