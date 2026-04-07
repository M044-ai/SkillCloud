// ============================================================
// functions/vote.js  — Netlify Function
// POST /vote          { skill_id }  → ajoute un vœu
// DELETE /vote        { skill_id }  → retire un vœu
// GET  /votes/me                    → liste des votes du user
//
// Mêmes variables d'environnement que discord-auth.js
// ============================================================

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MAX_VOTES = 10;

function verifySession(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/sc_session=([^;]+)/);
  if (!match) return null;
  try {
    const [dataB64, sig] = match[1].split('.');
    const data    = Buffer.from(dataB64, 'base64').toString();
    const expected = crypto.createHmac('sha256', process.env.JWT_SECRET).update(data).digest('hex');
    if (sig !== expected) return null;
    const payload = JSON.parse(data);
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

const cors = {
  'Access-Control-Allow-Origin':  process.env.DISCORD_REDIRECT_URI.replace('/.netlify/functions/discord-auth', ''),
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors };
  }

  const session = verifySession(event.headers.cookie);
  if (!session) {
    return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Non authentifié' }) };
  }

  const { discord_id, discord_username } = session;

  // ── GET /vote → mes votes ──────────────────────────────────
  if (event.httpMethod === 'GET') {
    const { data } = await supabase
      .from('votes')
      .select('skill_id')
      .eq('discord_user_id', discord_id);
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ voted_skill_ids: (data || []).map(v => v.skill_id) }),
    };
  }

  const body = JSON.parse(event.body || '{}');
  const { skill_id } = body;
  if (!skill_id) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'skill_id requis' }) };
  }

  // ── POST /vote → ajouter un vœu ───────────────────────────
  if (event.httpMethod === 'POST') {
    // Vérifier quota
    const { count } = await supabase
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .eq('discord_user_id', discord_id);

    if (count >= MAX_VOTES) {
      return {
        statusCode: 422,
        headers: cors,
        body: JSON.stringify({ error: `Quota atteint (max ${MAX_VOTES} souhaits)` }),
      };
    }

    const { error } = await supabase.from('votes').insert({
      discord_user_id:  discord_id,
      discord_username: discord_username,
      skill_id,
    });

    if (error) {
      return { statusCode: 409, headers: cors, body: JSON.stringify({ error: error.message }) };
    }
    return { statusCode: 201, headers: cors, body: JSON.stringify({ ok: true }) };
  }

  // ── DELETE /vote → retirer un vœu ─────────────────────────
  if (event.httpMethod === 'DELETE') {
    await supabase
      .from('votes')
      .delete()
      .eq('discord_user_id', discord_id)
      .eq('skill_id', skill_id);
    return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, headers: cors, body: 'Method not allowed' };
};
