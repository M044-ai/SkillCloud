// ============================================================
// functions/tally-webhook.js  — Netlify Function
// Reçoit les soumissions Tally et les écrit dans Supabase
//
// Dans Tally : Integrations > Webhooks > URL de cette function
// Variables : SUPABASE_URL, SUPABASE_SERVICE_KEY, TALLY_SIGNING_SECRET
//
// Structure attendue du formulaire Tally :
//   - Champ "prénom"         → question type INPUT_TEXT, label "prénom"
//   - Champ "catégorie"      → INPUT_TEXT, label "catégorie"
//   - Champ "compétence"     → INPUT_TEXT, label "compétence"
//   - Champ "niveau"         → MULTIPLE_CHOICE, label "niveau"
//     options : "1 – Découverte", "2 – Pratique", "3 – Expert"
// ============================================================

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function verifyTallySignature(rawBody, sigHeader) {
  if (!process.env.TALLY_SIGNING_SECRET) return true; // skip si non configuré
  const expected = crypto
    .createHmac('sha256', process.env.TALLY_SIGNING_SECRET)
    .update(rawBody)
    .digest('hex');
  return sigHeader === expected;
}

function extractField(fields, labelSubstring) {
  const f = fields.find(f =>
    f.label?.toLowerCase().includes(labelSubstring.toLowerCase())
  );
  if (!f) return null;
  // Tally renvoie value ou options[].text selon le type
  if (f.value !== undefined && f.value !== null) return String(f.value).trim();
  if (Array.isArray(f.options)) {
    const selected = f.options.find(o => o.isSelected);
    return selected ? selected.text.trim() : null;
  }
  return null;
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const rawBody = event.body;
  const sig     = event.headers['tally-signature'];

  if (!verifyTallySignature(rawBody, sig)) {
    return { statusCode: 401, body: 'Invalid signature' };
  }

  let payload;
  try { payload = JSON.parse(rawBody); } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const fields = payload?.data?.fields || [];

  const participant  = extractField(fields, 'prénom');
  const categoryName = extractField(fields, 'catégorie');
  const skillName    = extractField(fields, 'compétence');
  const levelRaw     = extractField(fields, 'niveau');

  if (!participant || !skillName) {
    return { statusCode: 422, body: 'Missing required fields' };
  }

  // Niveau : extrait le chiffre (ex: "2 – Pratique" → 2)
  const level = levelRaw ? parseInt(levelRaw.charAt(0)) : 1;
  if (isNaN(level) || level < 1 || level > 3) {
    return { statusCode: 422, body: 'Invalid level' };
  }

  // Upsert catégorie si fournie
  let categoryId = null;
  if (categoryName) {
    const { data: existingCat } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', categoryName)
      .single();

    if (existingCat) {
      categoryId = existingCat.id;
    } else {
      // Nouvelle catégorie — couleur par défaut grise, à affiner manuellement
      const { data: newCat } = await supabase
        .from('categories')
        .insert({ name: categoryName, color_hex: '#888780' })
        .select('id')
        .single();
      categoryId = newCat?.id;
    }
  }

  // Upsert compétence
  const { data: existingSkill } = await supabase
    .from('skills')
    .select('id')
    .ilike('name', skillName)
    .single();

  let skillId;
  if (existingSkill) {
    skillId = existingSkill.id;
  } else {
    const { data: newSkill } = await supabase
      .from('skills')
      .insert({ name: skillName, category_id: categoryId })
      .select('id')
      .single();
    skillId = newSkill?.id;
  }

  if (!skillId) {
    return { statusCode: 500, body: 'Could not upsert skill' };
  }

  // Upsert déclaration
  const { error } = await supabase
    .from('declarations')
    .upsert(
      { participant, skill_id: skillId, level },
      { onConflict: 'participant,skill_id' }
    );

  if (error) {
    console.error('Supabase error:', error);
    return { statusCode: 500, body: error.message };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
