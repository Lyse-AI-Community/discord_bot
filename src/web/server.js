// =========================================================================
// Serveur Web Express : Dashboard d'administration des types de demande.
// Ce serveur tourne dans le même processus Node.js que le bot Discord
// (voir src/index.js), ce qui permet un accès direct et synchrone à la
// base SQLite partagée.
// =========================================================================

const path = require('path');
const express = require('express');
const session = require('express-session');

const { router: routesAuth, requireAuth } = require('./routes/auth');
const routesTypes = require('./routes/types');

/**
 * Crée et configure l'application Express du Dashboard.
 * @returns {import('express').Express}
 */
function creerServeurWeb() {
    const app = express();

    // Moteur de templates EJS
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));

    // Parsing des formulaires HTML (application/x-www-form-urlencoded)
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    // Gestion de session (authentification simple par mot de passe)
    app.use(
        session({
            secret: process.env.SESSION_SECRET || 'change_moi_en_production',
            resave: false,
            saveUninitialized: false,
            cookie: {
                httpOnly: true,
                maxAge: 1000 * 60 * 60 * 8, // Session valide 8h
            },
        })
    );

    // Routes publiques (connexion / déconnexion)
    app.use('/', routesAuth);

    // Routes protégées du Dashboard (nécessitent une authentification)
    app.use('/', requireAuth, routesTypes);

    // Gestion des routes inconnues
    app.use((req, res) => {
        res.status(404).send('Page introuvable.');
    });

    // Gestionnaire d'erreurs global Express
    app.use((err, req, res, next) => {
        console.error('[Web] Erreur non gérée :', err);
        res.status(500).send('Une erreur interne est survenue.');
    });

    return app;
}

/**
 * Démarre le serveur Web sur le port configuré.
 * @param {import('discord.js').Client} discordClient - Réservé pour de futures fonctionnalités (ex: stats live)
 */
function demarrerServeurWeb(discordClient) {
    const app = creerServeurWeb();
    const port = process.env.PORT || 3000;

    app.listen(port, () => {
        console.log(`[Web] Dashboard disponible sur http://localhost:${port}`);
    });

    return app;
}

module.exports = { creerServeurWeb, demarrerServeurWeb };
