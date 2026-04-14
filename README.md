# ✦ Souvenir — Site de dédicaces

Site web statique pour partager des souvenirs avec photos et dédicaces.

## Structure des fichiers

```
index.html          → Page publique principale
login.html          → Connexion admin
admin.html          → Dashboard admin
styles.css          → Styles du site
app.js              → Logique page publique
admin.js            → Logique admin (CRUD)
supabase-config.js  → Tes clés Supabase (à remplir !)
supabase-schema.sql → Script SQL pour créer les tables
render.yaml         → Config déploiement Render
```

---

## Étape 1 — Configurer Supabase

1. Va sur https://supabase.com et crée un projet gratuit
2. Dans **SQL Editor**, exécute le contenu de `supabase-schema.sql`
3. Dans **Storage**, crée un bucket nommé `memories` et coche **Public**
4. Récupère tes clés dans **Settings > API** :
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
5. Modifie `supabase-config.js` avec tes vraies valeurs

## Étape 2 — Créer un compte admin

Dans Supabase > **Authentication > Users > Invite User**, crée un utilisateur avec ton email et mot de passe. C'est ce compte qui te permettra d'accéder à `/admin.html`.

## Étape 3 — Déployer sur Render

1. Push ce dossier sur un repo GitHub ou GitLab
2. Va sur https://render.com et crée un **Static Site**
3. Connecte ton repo
4. Build command : laisser vide
5. Publish directory : `.`
6. Clique **Deploy**

Ton site sera en ligne gratuitement sur une URL `.onrender.com` !

---

## Utilisation

- **Page publique** : Les visiteurs voient les photos avec les dédicaces au survol
- **Bouton "Se connecter"** en haut à droite → `/login.html`
- **Dashboard admin** → Ajouter/modifier/supprimer des souvenirs, citations et paramètres

---

## Personnalisation rapide

- Modifie les couleurs dans `styles.css` (variable `--teal`)
- Change le nom "Souvenir" dans chaque fichier HTML
- L'image hero vient d'Unsplash — remplace l'URL dans `styles.css` si tu veux
