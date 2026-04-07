# Skillcloud — Guide de déploiement

Architecture : Tally → Supabase ← Netlify Functions ← Nuage 3D (GitHub Pages)

## Variables d'environnement

| Variable               | Où la trouver                                    |
|------------------------|--------------------------------------------------|
| SUPABASE_URL           | Supabase > Settings > API > Project URL          |
| SUPABASE_ANON_KEY      | Supabase > Settings > API > anon public          |
| SUPABASE_SERVICE_KEY   | Supabase > Settings > API > service_role         |
| DISCORD_CLIENT_ID      | Discord Dev Portal > OAuth2 > Client ID          |
| DISCORD_CLIENT_SECRET  | Discord Dev Portal > OAuth2 > Client Secret      |
| DISCORD_REDIRECT_URI   | https://VOTRE-SITE.netlify.app/.netlify/functions/discord-auth |
| TALLY_API_KEY          | Tally > Settings > API keys                      |
| TALLY_WORKSPACE_ID     | URL de votre workspace Tally                     |
| TALLY_SIGNING_SECRET   | Tally > Integrations > Webhooks > Signing secret |
| JWT_SECRET             | Chaîne aléatoire (openssl rand -hex 32)          |

## Étapes de déploiement

### 1. Supabase
1. Créer un projet sur supabase.com (gratuit)
2. SQL Editor > New query > coller et exécuter db/schema.sql
3. Database > Replication > cocher tables declarations et votes

### 2. Netlify
1. Créer un site, connecter le repo GitHub
2. Base directory: skillcloud / Functions: functions / Publish: public
3. Ajouter toutes les variables d'environnement

### 3. Discord App
1. discord.com/developers > New Application > OAuth2
2. Ajouter Redirect: https://VOTRE-SITE.netlify.app/.netlify/functions/discord-auth
3. Scopes: identify

### 4. Formulaire Tally
  pip install requests python-dotenv
  python create_tally_form.py
Puis dans Tally: Integrations > Webhooks > URL Netlify

### 5. Nuage 3D (public/index.html)
Remplacer les 5 constantes en haut du script, pousser sur GitHub Pages.

## Encodage visuel

Taille  = votes       → size = 12 + (votes/maxVotes) × 34 px
Couleur = rarété      → lerp(gris, couleurCatégorie, 1 - porteurs/17)

## Lecture stratégique

Grand + saturé → très demandé + rare   → atelier prioritaire
Grand + gris   → très demandé + commun → atelier ouvert
Petit + saturé → peu demandé + rare    → niche
Petit + gris   → peu demandé + commun  → inutile à organiser

## Niveaux

1 ●○○ Découverte — notions, curiosité
2 ●●○ Pratique   — expérience concrète
3 ●●● Expert     — référent, peut animer

avg_level élevé = animateur disponible dans la promo
avg_level bas   = atelier découverte collectif
