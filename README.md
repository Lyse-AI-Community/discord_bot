# 🎫 Discord Ticket Bot — Gestion de demandes + Dashboard Web

Bot Discord de gestion de demandes/tickets pour projet Open-Source, accompagné d'un Dashboard Web
permettant de configurer les types de demandes (salon cible, salon de logs, rôle à pinger)
**sans jamais redémarrer le bot**.

Le bot officiel du serveur Discord Lyse.AI Community !

---

## 🛠️ Stack technique

| Composant        | Technologie                          |
|-------------------|---------------------------------------|
| Runtime           | Node.js 18+                           |
| Bot Discord       | discord.js v14                        |
| Serveur Web / API | Express.js (même process que le bot)  |
| Base de données   | SQLite via `better-sqlite3`           |
| Vues Web          | EJS + Bootstrap 5 (CDN)               |
| Sessions Web      | `express-session`                     |

---

## 🗂️ Structure du projet

```
/
├── src/
│   ├── bot/
│   │   ├── commands/        # Commandes Slash (/setup-panel)
│   │   ├── events/          # Événements Discord (ready, interactionCreate)
│   │   ├── components/      # Boutons, Modals, identifiants de composants
│   │   ├── utils/           # Helpers (embeds, logs)
│   │   └── client.js        # Initialisation du client discord.js
│   ├── db/
│   │   ├── database.js      # Connexion + requêtes SQLite (better-sqlite3)
│   │   ├── schema.sql       # Création des tables (request_types, tickets)
│   │   └── tickets.db       # Fichier SQLite généré au 1er lancement (non versionné)
│   ├── web/
│   │   ├── routes/          # Routes Express (auth.js, types.js)
│   │   ├── views/           # Templates EJS (login.ejs, dashboard.ejs)
│   │   └── server.js        # Serveur Express (Dashboard)
│   └── index.js             # Point d'entrée : lance le Bot + le Dashboard
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 🎯 Fonctionnalités

### Bot Discord

1. **`/setup-panel [salon]`** — Publie un Embed fixe avec un bouton `➕ Créer une demande`
   dans le salon indiqué (ou le salon courant). Nécessite la permission `Gérer le serveur`.
2. **Modal de création** — Au clic sur le bouton, un formulaire s'ouvre avec :
   - Type de demande (ex : `Visuel`, `Entraînement IA`, `Code`)
   - Nom de la demande (titre court)
   - Description détaillée
3. **Création automatique** — À la soumission :
   - Recherche de la configuration du type en base SQLite
   - Création d'un **Thread** dédié dans le salon cible configuré
   - Envoi d'un Embed récapitulatif + **ping du rôle** configuré
   - Ajout de 3 boutons d'action : ⚙️ **Prendre en charge**, ✅ **Terminer**, ❌ **Rejeter**
4. **Cycle de vie du ticket** :
   - `⚙️ Prendre en charge` → assigne le membre, statut `en_cours`
   - `✅ Terminer` → statut `resolu`, archive le thread
   - `❌ Rejeter` → statut `rejete`, archive le thread
   - Une fois le ticket clôturé (`resolu` ou `rejete`), un bouton `🗑️ Supprimer le fil`
     remplace les boutons d'action et permet de supprimer définitivement le thread Discord.
   - Seuls les administrateurs (`Gérer le serveur`) ou les membres possédant **au moins un**
     des rôles autorisés pour ce type (rôle pingé + rôles gestionnaires additionnels
     configurables dans le Dashboard) peuvent utiliser ces boutons. Un membre cumulant
     plusieurs rôles n'a besoin que d'un seul rôle correspondant pour être autorisé.
5. **Logs automatiques** — Chaque étape (création, prise en charge, clôture/rejet) est
   journalisée dans le salon de logs configuré pour le type concerné.

### Dashboard Web (`/`)

- Protégé par mot de passe (`ADMIN_PASSWORD`), session cookie signée.
- Liste, ajout, modification et suppression des **types de demande**.
- Pour chaque type : Nom, ID Salon cible, ID Salon de logs, ID Rôle à pinger, et
  **IDs des rôles gestionnaires additionnels** (optionnel, plusieurs rôles séparés par des
  virgules) autorisés à gérer les tickets de ce type.
- Sauvegarde **instantanée** en SQLite : `better-sqlite3` étant synchrone et le bot lisant
  la base directement à chaque interaction, **aucun redémarrage n'est nécessaire**.

---

## 🚀 Installation

### 1. Prérequis

- [Node.js](https://nodejs.org/) v18 ou supérieur
- Un compilateur C/C++ disponible sur la machine (requis par `better-sqlite3` pour sa
  compilation native) :
  - **Linux (Debian/Ubuntu)** : `sudo apt install build-essential python3`
  - **Linux (Fedora)** : `sudo dnf install gcc gcc-c++ make python3`
  - **macOS** : `xcode-select --install`
  - **Windows** : installer les "Outils de génération C++" via Visual Studio Build Tools

### 2. Cloner et installer les dépendances

```bash
git clone <url-du-repo>
cd discord_bot
npm install
```

### 3. Créer l'application Discord

1. Va sur le [Portail Développeur Discord](https://discord.com/developers/applications).
2. Crée une application, puis un **Bot** dans l'onglet `Bot` (récupère le **Token**).
3. Récupère le **Client ID** (Application ID) dans l'onglet `General Information`.
4. Sous l'onglet `Bot`, active l'intent **Server Members Intent**.
5. Invite le bot sur ton serveur avec les permissions minimales suivantes :
   `Gérer les fils de discussion`, `Envoyer des messages`, `Envoyer des messages dans les fils`,
   `Intégrer des liens`, `Mentionner @everyone/rôles`, `Utiliser des commandes slash`.

### 4. Configurer les variables d'environnement

Copie le fichier d'exemple puis complète-le :

```bash
cp .env.example .env
```

```env
DISCORD_TOKEN=ton_token_bot
CLIENT_ID=ton_client_id
GUILD_ID=                       # Optionnel : ID du serveur pour un déploiement instantané des commandes
PORT=3000
ADMIN_PASSWORD=un_mot_de_passe_securise
SESSION_SECRET=change_moi_en_production
```

> 💡 `GUILD_ID` est optionnel : s'il est renseigné, les commandes Slash sont enregistrées
> immédiatement sur ce serveur (pratique en développement). Sinon, elles sont enregistrées
> en global (jusqu'à 1h de propagation).

### 5. Lancer le projet

```bash
npm start
```

Ce processus unique démarre :
- La base SQLite (`src/db/tickets.db`, créée automatiquement si absente)
- Le Bot Discord (connexion + enregistrement des commandes Slash)
- Le Dashboard Web sur `http://localhost:3000` (ou le `PORT` défini)

Pour le développement avec rechargement automatique :

```bash
npm run dev
```

---

## 🧭 Utilisation

### 1. Configurer les types de demande

Ouvre `http://localhost:3000`, connecte-toi avec `ADMIN_PASSWORD`, puis ajoute un type
de demande en renseignant :
- **Nom du type** (ex : `Visuel`) — c'est ce nom que les utilisateurs devront saisir dans le Modal
- **ID du salon cible** (clic droit sur le salon > `Copier l'identifiant`, mode développeur requis)
- **ID du salon de logs**
- **ID du rôle** à pinger

> Active le **Mode développeur** dans Discord : `Paramètres utilisateur > Avancés > Mode développeur`.

### 2. Publier le panneau

Dans le salon souhaité sur Discord, exécute :

```
/setup-panel
```

(ou `/setup-panel salon:#mon-salon` pour cibler un autre salon).

### 3. Créer une demande

Les membres cliquent sur `➕ Créer une demande`, remplissent le formulaire, et un thread
dédié est automatiquement créé avec les bonnes personnes notifiées.

---

## 🗄️ Base de données

Deux tables SQLite (voir `src/db/schema.sql`) :

- **`request_types`** : configuration des types de demande (nom, salons, rôle à pinger,
  rôles gestionnaires additionnels autorisant la gestion des tickets).
- **`tickets`** : historique et état de chaque demande créée (statut, auteur, assigné, thread).

Statuts possibles d'un ticket : `ouvert` → `en_cours` → `resolu` | `rejete`.

---

## 💡 Recommandations pour l'hébergement

- **Ne versionne jamais le fichier `.db`** : le `.gitignore` fourni exclut déjà
  `src/db/*.db` et `.env`. Si ton repo est public, vérifie qu'aucun secret n'a été committé.
- **GitHub ne permet pas de faire tourner un processus serveur continu** (Actions est pensé
  pour du CI/CD ponctuel, pas pour héberger un bot 24/7). Pour héberger ce projet, oriente-toi
  vers un hébergeur qui exécute un processus Node.js persistant, par exemple :
  - **Railway**, **Render**, **Fly.io** — offres gratuites/low-cost, déploiement Git direct.
  - **VPS** (OVH, Hetzner, DigitalOcean) avec `pm2` pour garder le process actif.
  - ⚠️ Vérifie que l'hébergeur supporte la compilation native (`better-sqlite3`) ou utilise
    une image Docker avec les outils de build (`build-essential`) installés.
- **Persistance du disque** : sur certains hébergeurs (conteneurs éphémères), le fichier
  SQLite peut être perdu à chaque redéploiement. Utilise un volume persistant, ou migre vers
  une base hébergée (ex : Turso, PostgreSQL) si tu as besoin de durabilité forte.
- **Sécurité du Dashboard** : `ADMIN_PASSWORD` est un mot de passe unique simple, adapté à un
  usage interne restreint. Pour une exposition publique, ajoute HTTPS (reverse proxy) et
  envisage une authentification plus robuste (OAuth2 Discord, hachage du mot de passe, etc.).

---

## 🧩 Extensions possibles

- Authentification du Dashboard via OAuth2 Discord (limiter l'accès aux admins du serveur).
- Statistiques (nombre de tickets par statut/type) sur le Dashboard.
- Historique des tickets consultable depuis le Dashboard.
- Multi-serveurs (actuellement, chaque type de demande référence des IDs de salons/rôles
  propres à un seul serveur Discord).

---

## 📄 Licence

Voir le fichier [LICENSE](./LICENSE).
