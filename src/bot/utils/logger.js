// =========================================================================
// Utilitaire d'envoi des messages de log dans le salon configuré
// pour un type de demande donné.
// =========================================================================

const { construireEmbedLog } = require('./embeds');

/**
 * Envoie un message de log dans le salon de logs configuré pour un type de demande.
 * Les erreurs (salon introuvable, permissions manquantes, etc.) sont interceptées
 * et journalisées en console sans interrompre le flux principal.
 *
 * @param {import('discord.js').Client} client
 * @param {string} logChannelId - ID du salon de logs configuré pour le type de demande
 * @param {string} titre
 * @param {string} description
 * @param {number} [couleur]
 */
async function envoyerLog(client, logChannelId, titre, description, couleur) {
    if (!logChannelId) return;

    try {
        const salonLog = await client.channels.fetch(logChannelId);
        if (!salonLog || !salonLog.isTextBased()) {
            console.warn(`[Logger] Le salon de logs ${logChannelId} est introuvable ou non textuel.`);
            return;
        }

        const embed = construireEmbedLog(titre, description, couleur);
        await salonLog.send({ embeds: [embed] });
    } catch (erreur) {
        console.error(`[Logger] Impossible d'envoyer le log dans le salon ${logChannelId} :`, erreur);
    }
}

module.exports = { envoyerLog };
