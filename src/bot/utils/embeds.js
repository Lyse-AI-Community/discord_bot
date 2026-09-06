// =========================================================================
// Fonctions utilitaires de construction des Embeds Discord
// utilisés à travers le cycle de vie d'un ticket.
// =========================================================================

const { EmbedBuilder } = require('discord.js');

// Couleurs associées à chaque statut de ticket
const COULEURS_STATUT = {
    ouvert: 0x5865f2, // Bleu Discord
    en_cours: 0xf5a623, // Orange
    resolu: 0x57f287, // Vert
    rejete: 0xed4245, // Rouge
};

const LIBELLES_STATUT = {
    ouvert: '🟦 Ouvert',
    en_cours: '🟧 En cours',
    resolu: '✅ Résolu',
    rejete: '❌ Rejeté',
};

/**
 * Construit l'Embed récapitulatif d'un ticket, affiché dans le thread dédié.
 * @param {Object} ticket - Ligne de la table `tickets`
 * @returns {EmbedBuilder}
 */
function construireEmbedTicket(ticket) {
    const embed = new EmbedBuilder()
        .setColor(COULEURS_STATUT[ticket.status] ?? 0x5865f2)
        .setTitle(`📋 Demande #${ticket.id} — ${ticket.request_name}`)
        .addFields(
            { name: 'Type', value: ticket.type_name, inline: true },
            { name: 'Statut', value: LIBELLES_STATUT[ticket.status] ?? ticket.status, inline: true },
            { name: 'Auteur', value: `<@${ticket.author_id}>`, inline: true },
            { name: 'Description', value: ticket.description || 'Aucune description fournie.' }
        )
        .setFooter({ text: `Ticket #${ticket.id}` })
        .setTimestamp(new Date(ticket.created_at));

    if (ticket.assigned_to) {
        embed.addFields({ name: 'Pris en charge par', value: `<@${ticket.assigned_to}>`, inline: true });
    }

    return embed;
}

/**
 * Construit un Embed de log simple pour un événement du cycle de vie d'un ticket.
 * @param {string} titre
 * @param {string} description
 * @param {number} [couleur]
 * @returns {EmbedBuilder}
 */
function construireEmbedLog(titre, description, couleur = 0x5865f2) {
    return new EmbedBuilder()
        .setColor(couleur)
        .setTitle(titre)
        .setDescription(description)
        .setTimestamp();
}

module.exports = {
    COULEURS_STATUT,
    LIBELLES_STATUT,
    construireEmbedTicket,
    construireEmbedLog,
};
