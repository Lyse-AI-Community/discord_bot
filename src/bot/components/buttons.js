// =========================================================================
// Gestion des interactions sur les boutons :
//  - Bouton du panneau fixe ("➕ Créer une demande") -> ouverture du Modal
//  - Boutons d'action d'un ticket ("Prendre en charge" / "Terminer" / "Rejeter")
// =========================================================================

const { PermissionFlagsBits } = require('discord.js');
const db = require('../../db/database');
const { construireEmbedTicket } = require('../utils/embeds');
const { envoyerLog } = require('../utils/logger');
const { construireModalDemande, construireBoutonsTicket, construireBoutonSuppression } = require('./modals');
const {
    CREATE_REQUEST_BUTTON_ID,
    TICKET_TAKE_PREFIX,
    TICKET_COMPLETE_PREFIX,
    TICKET_REJECT_PREFIX,
    TICKET_DELETE_PREFIX,
    extraireTicketId,
} = require('./ids');

/**
 * Vérifie si le membre à l'origine de l'interaction est autorisé à gérer le ticket :
 * il doit soit posséder la permission "Gérer le serveur", soit posséder au moins un des
 * rôles autorisés pour le type de demande concerné (rôle à pinger + rôles gestionnaires
 * additionnels configurés dans le Dashboard). Un membre peut cumuler plusieurs rôles :
 * il suffit qu'un seul d'entre eux figure dans la liste des rôles autorisés.
 *
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {Object|undefined} typeConfig - Configuration du type de demande (peut être undefined si supprimé)
 * @returns {boolean}
 */
function membreAutorise(interaction, typeConfig) {
    const membre = interaction.member;
    if (!membre) return false;
    if (membre.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
    if (!typeConfig) return false;

    const rolesAutorises = db.getRolesAutorises(typeConfig);
    return rolesAutorises.some((roleId) => membre.roles.cache.has(roleId));
}

/**
 * Gère le clic sur le bouton du panneau fixe : ouvre le Modal de création de demande.
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function gererBoutonPanneau(interaction) {
    try {
        const modal = construireModalDemande();
        await interaction.showModal(modal);
    } catch (erreur) {
        console.error('[Bouton Panneau] Erreur lors de l\'ouverture du Modal :', erreur);
        await interaction.reply({
            content: "❌ Impossible d'ouvrir le formulaire de demande pour le moment.",
            ephemeral: true,
        });
    }
}

/**
 * Met à jour le message contenant l'Embed du ticket (dans le thread) avec
 * son nouvel état, et adapte les boutons affichés selon le statut.
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {Object} ticket - Ticket mis à jour
 */
async function rafraichirMessageTicket(interaction, ticket) {
    const embed = construireEmbedTicket(ticket);

    // Une fois le ticket résolu ou rejeté, les boutons d'action sont remplacés
    // par un unique bouton permettant de supprimer le fil.
    const composants =
        ticket.status === 'resolu' || ticket.status === 'rejete'
            ? [construireBoutonSuppression(ticket.id)]
            : [construireBoutonsTicket(ticket.id)];

    await interaction.update({ embeds: [embed], components: composants });
}

/**
 * Gère le clic sur un des boutons d'action d'un ticket
 * (Prendre en charge / Terminer / Rejeter).
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function gererBoutonTicket(interaction) {
    const { customId } = interaction;

    let action = null;
    let ticketId = null;

    if ((ticketId = extraireTicketId(customId, TICKET_TAKE_PREFIX)) !== null) {
        action = 'take';
    } else if ((ticketId = extraireTicketId(customId, TICKET_COMPLETE_PREFIX)) !== null) {
        action = 'complete';
    } else if ((ticketId = extraireTicketId(customId, TICKET_REJECT_PREFIX)) !== null) {
        action = 'reject';
    } else if ((ticketId = extraireTicketId(customId, TICKET_DELETE_PREFIX)) !== null) {
        action = 'delete';
    }

    if (!action || ticketId === null) return;

    try {
        const ticket = db.getTicketById(ticketId);
        if (!ticket) {
            await interaction.reply({ content: '❌ Ce ticket est introuvable en base de données.', ephemeral: true });
            return;
        }

        const typeConfig = ticket.type_id ? db.getTypeById(ticket.type_id) : undefined;

        // Vérification des permissions : seul un membre du rôle concerné ou un administrateur peut agir
        if (!membreAutorise(interaction, typeConfig)) {
            await interaction.reply({
                content: "❌ Tu n'as pas la permission de gérer ce ticket.",
                ephemeral: true,
            });
            return;
        }

        switch (action) {
            case 'take':
                await traiterPriseEnCharge(interaction, ticket, typeConfig);
                break;
            case 'complete':
                await traiterCloture(interaction, ticket, typeConfig, 'resolu');
                break;
            case 'reject':
                await traiterCloture(interaction, ticket, typeConfig, 'rejete');
                break;
            case 'delete':
                await traiterSuppression(interaction, ticket, typeConfig);
                break;
        }
    } catch (erreur) {
        console.error(`[Bouton Ticket] Erreur lors du traitement de l'action "${action}" :`, erreur);
        const message = { content: '❌ Une erreur est survenue lors du traitement de cette action.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(message).catch(() => {});
        } else {
            await interaction.reply(message).catch(() => {});
        }
    }
}

/**
 * Traite l'action "Prendre en charge" : assigne le ticket au membre et passe le statut en "en_cours".
 */
async function traiterPriseEnCharge(interaction, ticket, typeConfig) {
    if (ticket.status !== 'ouvert') {
        await interaction.reply({
            content: `⚠️ Ce ticket n'est plus "ouvert" (statut actuel : ${ticket.status}).`,
            ephemeral: true,
        });
        return;
    }

    const ticketMisAJour = db.updateTicketStatus(ticket.id, 'en_cours', interaction.user.id);
    await rafraichirMessageTicket(interaction, ticketMisAJour);

    await envoyerLog(
        interaction.client,
        typeConfig?.log_channel_id,
        '⚙️ Demande prise en charge',
        `**Ticket #${ticket.id}** (${ticket.type_name}) pris en charge par <@${interaction.user.id}>.`,
        0xf5a623
    );
}

/**
 * Traite les actions "Terminer" et "Rejeter" : met à jour le statut et archive le thread.
 * @param {'resolu'|'rejete'} nouveauStatut
 */
async function traiterCloture(interaction, ticket, typeConfig, nouveauStatut) {
    if (ticket.status === 'resolu' || ticket.status === 'rejete') {
        await interaction.reply({
            content: `⚠️ Ce ticket est déjà clôturé (statut actuel : ${ticket.status}).`,
            ephemeral: true,
        });
        return;
    }

    const ticketMisAJour = db.updateTicketStatus(ticket.id, nouveauStatut);
    await rafraichirMessageTicket(interaction, ticketMisAJour);

    const estResolu = nouveauStatut === 'resolu';

    // Message de clôture visible dans le thread avant archivage
    await interaction.channel
        .send({
            content: estResolu
                ? `✅ Demande marquée comme **résolue** par <@${interaction.user.id}>. Ce fil va être archivé.`
                : `❌ Demande **rejetée** par <@${interaction.user.id}>. Ce fil va être archivé.`,
        })
        .catch((erreur) => console.error('[Clôture Ticket] Impossible d\'envoyer le message de clôture :', erreur));

    // Archivage du thread (le bot doit avoir la permission "Gérer les fils de discussion")
    if (interaction.channel?.isThread()) {
        await interaction.channel.setArchived(true, `Ticket ${nouveauStatut} par ${interaction.user.tag}`).catch((erreur) =>
            console.error('[Clôture Ticket] Impossible d\'archiver le thread :', erreur)
        );
    }

    await envoyerLog(
        interaction.client,
        typeConfig?.log_channel_id,
        estResolu ? '✅ Demande résolue' : '❌ Demande rejetée',
        `**Ticket #${ticket.id}** (${ticket.type_name}) ${estResolu ? 'résolu' : 'rejeté'} par <@${interaction.user.id}>.`,
        estResolu ? 0x57f287 : 0xed4245
    );
}

/**
 * Traite l'action "Supprimer le fil" : ne peut être déclenchée que sur un ticket
 * déjà clôturé (résolu ou rejeté), et supprime définitivement le thread Discord.
 */
async function traiterSuppression(interaction, ticket, typeConfig) {
    if (ticket.status !== 'resolu' && ticket.status !== 'rejete') {
        await interaction.reply({
            content: '⚠️ Seul un ticket clôturé (résolu ou rejeté) peut être supprimé.',
            ephemeral: true,
        });
        return;
    }

    // On acquitte l'interaction avant de supprimer le fil (le message contenant
    // le bouton disparaîtra avec le thread).
    await interaction.deferUpdate().catch(() => {});

    await envoyerLog(
        interaction.client,
        typeConfig?.log_channel_id,
        '🗑️ Fil supprimé',
        `**Ticket #${ticket.id}** (${ticket.type_name}) supprimé par <@${interaction.user.id}>.`,
        0x99aab5
    );

    if (interaction.channel?.isThread()) {
        await interaction.channel
            .delete(`Ticket ${ticket.status} supprimé par ${interaction.user.tag}`)
            .catch((erreur) => console.error('[Suppression Ticket] Impossible de supprimer le thread :', erreur));
    }
}

module.exports = {
    CREATE_REQUEST_BUTTON_ID,
    gererBoutonPanneau,
    gererBoutonTicket,
};
