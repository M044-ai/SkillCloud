// ============================================================
// functions/discord-auth.js  — Netlify Function
// Gère le callback OAuth Discord et l'échange de token
//
// Variables d'environnement à définir dans Netlify :
//   DISCORD_CLIENT_ID      — App ID dans Discord Developer Portal
//   DISCORD_CLIENT_SECRET  — Secret de l'app Discord
//   DISCORD_REDIRECT_URI   — ex: https://votre-site.netlify.app/.netlify/functions/discord-auth
//   SUPABASE_URL           — ex: https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY   — clé service_role (Settings > API)
//   JWT_SECRET             — chaîne aléatoire pour signer les sessions
// ============================================================

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function signToken(payload) {
  const data = JSON.stringify(payload);
  const sig  = crypto.createHmac('sha256', process.env.JWT_SECRET).update(data).digest('hex');
  return Buffer.from(data).toString('base64') + '.' + sig;
}

exports.handler = async (event) => {
  const { code, error } = event.queryStringParameters || {};
  const origin = process.env.DISCORD_REDIRECT_URI.replace('/.netlify/functions/discord-auth', '');

  if (error) {
    return { statusCode: 302, headers: { Location: `${origin}?auth=cancelled` } };
  }

  if (!code) {
    return { statusCode: 400, body: 'Missing code' };
  }

  // Échange du code contre un access_token Discord
  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type:    'authorization_code',
      code,
      redirect_uri:  process.env.DISCORD_REDIRECT_URI,
    }),
  });

  if (!tokenRes.ok) {
    return { statusCode: 500, body: 'Token exchange failed' };
  }

  const { access_token } = await tokenRes.json();

  // Récupère l'identité Discord
  const userRes  = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const user = await userRes.json();

  // Session signée (valide 24h) — stockée en cookie httpOnly
  const session = signToken({
    discord_id:       user.id,
    discord_username: user.username,
    exp:              Date.now() + 86400 * 1000,
  });

  return {
    statusCode: 302,
    headers: {
      Location:   `${origin}?auth=success`,
      'Set-Cookie': `sc_session=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
    },
  };
};
