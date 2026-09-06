// =========================================================================
// Point d'entrée principal de l'application.
// Lance dans le même processus Node.js :
//   1. La base de données SQLite (création du schéma si nécessaire)
//   2. Le Bot Discord (discord.js)
//   3. Le serveur Web Express (Dashboard d'administration)
// =========================================================================

require('dotenv').config();

const { initDatabase } = require('./db/database');
const { creerClientDiscord } = require('./bot/client');
const { demarrerServeurWeb } = require('./web/server');

/**
 * Vérifie que les variables d'environnement indispensables sont bien définies.
 * Arrête le processus avec un message clair si l'une d'elles est manquante.
 */
function verifierVariablesEnvironnement() {
    const variablesRequises = ['DISCORD_TOKEN', 'CLIENT_ID', 'ADMIN_PASSWORD'];
    const manquantes = variablesRequises.filter((nom) => !process.env[nom]);

    if (manquantes.length > 0) {
        console.error(
            `[Démarrage] Variable(s) d'environnement manquante(s) : ${manquantes.join(', ')}.\n` +
                'Copie le fichier .env.example vers .env et complète les valeurs requises.'
        );
        process.exit(1);
    }
}

/**
 * Démarre l'ensemble de l'application (Bot Discord + Dashboard Web).
 */
async function demarrerApplication() {
    verifierVariablesEnvironnement();

    // 1. Initialisation de la base de données SQLite
    try {
        initDatabase();
    } catch (erreur) {
        console.error('[Démarrage] Impossible d\'initialiser la base de données. Arrêt du processus.', erreur);
        process.exit(1);
    }

    // 2. Démarrage du serveur Web (Dashboard d'administration)
    try {
        demarrerServeurWeb();
    } catch (erreur) {
        console.error('[Démarrage] Impossible de démarrer le serveur Web. Arrêt du processus.', erreur);
        process.exit(1);
    }

    // 3. Connexion du Bot Discord
    const client = creerClientDiscord();

    try {
        await client.login(process.env.DISCORD_TOKEN);
    } catch (erreur) {
        console.error('[Démarrage] Impossible de connecter le bot Discord (vérifie DISCORD_TOKEN).', erreur);
        process.exit(1);
    }
}

// Filet de sécurité : évite que le processus ne crashe silencieusement
process.on('unhandledRejection', (erreur) => {
    console.error('[Processus] Rejet de promesse non géré :', erreur);
});
process.on('uncaughtException', (erreur) => {
    console.error('[Processus] Exception non interceptée :', erreur);
});

demarrerApplication();
