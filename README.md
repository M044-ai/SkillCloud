# Skillcloud — Guide de déploiement (v2, sans Tally)

## Architecture

  form.html  →  Supabase (écriture directe)
  index.html →  Supabase Realtime (lecture)
  vote       →  Discord OAuth2 → Netlify Function → Supabase

## Variables d'environnement Netlify (7 au total)

| Variable               | Où la trouver                                        |
|------------------------|------------------------------------------------------|
| SUPABASE_URL           | Supabase > Settings > API > Project URL              |
| SUPABASE_SERVICE_KEY   | Supabase > Settings > API > service_role             |
| DISCORD_CLIENT_ID      | Discord Dev Portal > votre app > OAuth2              |
| DISCORD_CLIENT_SECRET  | Discord Dev Portal > votre app > OAuth2              |
| DISCORD_REDIRECT_URI   | https://bahut-ia4-skillcloud.netlify.app/.netlify/functions/discord-auth |
| JWT_SECRET             | Chaîne aléatoire (openssl rand -hex 32)              |

## Variables dans les fichiers HTML (à remplacer manuellement)

Dans public/form.html et public/index.html, remplacer :
  VOTRE_SUPABASE_URL       → https://xxxx.supabase.co
  VOTRE_SUPABASE_ANON_KEY  → clé anon publique (Settings > API)
  VOTRE_NETLIFY_URL        → https://bahut-ia4-skillcloud.netlify.app
  VOTRE_DISCORD_CLIENT_ID  → Client ID Discord

## Structure du repo GitHub

  public/
    form.html       ← formulaire de saisie (lien Discord phase 1)
    index.html      ← nuage 3D interactif (lien Discord phase 3)
  functions/
    discord-auth.js ← callback OAuth Discord
    vote.js         ← gestion des votes (POST/DELETE/GET)
  netlify.toml

## Étapes de déploiement

### 1. Supabase (déjà fait)
  - Tables créées, Realtime activé sur declarations et votes

### 2. Netlify
  - Connecter le repo GitHub
  - Base directory : vide
  - Publish directory : public
  - Functions directory : functions
  - Ajouter les 6 variables d'environnement ci-dessus
  - Deploy

### 3. Discord App (déjà fait)
  - Ajouter le Redirect URI définitif si l'URL Netlify a changé

### 4. Mettre à jour les constantes dans les HTML
  - public/form.html  : SUPABASE_URL, SUPABASE_ANON_KEY
  - public/index.html : SUPABASE_URL, SUPABASE_ANON_KEY, NETLIFY_URL, DISCORD_CLIENT_ID

### 5. Poster les liens dans Discord
  - Saisie compétences : https://bahut-ia4-skillcloud.netlify.app/form.html
  - Nuage + vote       : https://bahut-ia4-skillcloud.netlify.app/

## Ce qui a été supprimé par rapport à v1
  - Tally (formulaire, webhook, tally-webhook.js)
  - Variables : TALLY_API_KEY, TALLY_WORKSPACE_ID, TALLY_SIGNING_SECRET
  - Script create_tally_form.py

## Fonctionnement de form.html
  - Charge les catégories et compétences existantes depuis Supabase au démarrage
  - Autocomplete sur catégorie ET compétence (filtrée par catégorie choisie)
  - Saisie libre acceptée → crée automatiquement la catégorie/compétence dans Supabase
  - Après soumission, les nouvelles valeurs sont immédiatement disponibles
    pour le participant suivant
  - Écriture directe Supabase (clé anon + RLS)
