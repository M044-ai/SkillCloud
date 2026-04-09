// ============================================================
// api/discord-auth.js  — Vercel Serverless Function
// Gère le callback OAuth Discord et l'échange de token
//
// Variables d'environnement à définir dans Vercel :
//   DISCORD_CLIENT_ID      — App ID dans Discord Developer Portal
//   DISCORD_CLIENT_SECRET  — Secret de l'app Discord
//   DISCORD_REDIRECT_URI   — https://bahut-ia4-skillcloud.vercel.app/api/discord-auth
//   SUPABASE_URL           — https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY   — clé service_role (Settings > API)
//   JWT_SECRET             — chaîne aléatoire pour signer les sessions
// ============================================================

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const ORIGIN = 'https://bahut-ia4-skillcloud.vercel.app';

function signToken(payload) {
  const data = JSON.stringify(payload);
  const sig  = crypto.createHmac('sha256', process.env.JWT_SECRET).update(data).digest('hex');
  return Buffer.from(data).toString('base64') + '.' + sig;
}

module.exports = async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`${ORIGIN}?auth=cancelled`);
  }
  if (!code) {
    return res.status(400).send('Missing code');
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
    return res.status(500).send('Token exchange failed');
  }

  const { access_token } = await tokenRes.json();

  // Récupère l'identité Discord
  const userRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const user = await userRes.json();

  // Session signée (valide 24h)
  const session = signToken({
    discord_id:       user.id,
    discord_username: user.username,
    exp:              Date.now() + 86400 * 1000,
  });

  res.setHeader('Set-Cookie', `sc_session=${session}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
  return res.redirect(`${ORIGIN}?auth=success`);
};
