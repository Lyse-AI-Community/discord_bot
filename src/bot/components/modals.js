// =========================================================================
// Modal de création de demande : construction + traitement de la soumission
// =========================================================================

const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
} = require('discord.js');

const db = require('../../db/database');
const { construireEmbedTicket } = require('../utils/embeds');
const { envoyerLog } = require('../utils/logger');
const {
    REQUEST_MODAL_ID,
    REQUEST_MODAL_FIELD_TYPE,
    REQUEST_MODAL_FIELD_NAME,
    REQUEST_MODAL_FIELD_DESCRIPTION,
    TICKET_TAKE_PREFIX,
    TICKET_COMPLETE_PREFIX,
    TICKET_REJECT_PREFIX,
    TICKET_DELETE_PREFIX,
    construireTicketCustomId,
} = require('./ids');

/**
 * Construit le Modal de création de demande.
 * Le champ "Type de demande" affiche en placeholder la liste des types
 * actuellement configurés en base, afin de guider l'utilisateur.
 *
 * @returns {ModalBuilder}
 */
function construireModalDemande() {
    const typesDisponibles = db.getAllTypes();
    const listeTypes = typesDisponibles.map((t) => t.name).join(', ');
    const placeholderType = listeTypes
        ? `Ex : ${listeTypes}`.slice(0, 100)
        : 'Aucun type configuré pour le moment';

    const champType = new TextInputBuilder()
        .setCustomId(REQUEST_MODAL_FIELD_TYPE)
        .setLabel('Type de demande')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder(placeholderType)
        .setRequired(true)
        .setMaxLength(100);

    const champNom = new TextInputBuilder()
        .setCustomId(REQUEST_MODAL_FIELD_NAME)
        .setLabel('Nom de la demande')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Titre court résumant la demande')
        .setRequired(true)
        .setMaxLength(100);

    const champDescription = new TextInputBuilder()
        .setCustomId(REQUEST_MODAL_FIELD_DESCRIPTION)
        .setLabel('Description')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Explique ta demande en détail...')
        .setRequired(true)
        .setMaxLength(1000);

    return new ModalBuilder()
        .setCustomId(REQUEST_MODAL_ID)
        .setTitle('📨 Nouvelle demande')
        .addComponents(
            new ActionRowBuilder().addComponents(champType),
            new ActionRowBuilder().addComponents(champNom),
            new ActionRowBuilder().addComponents(champDescription)
        );
}

/**
 * Construit la ligne de boutons d'action présents sous l'Embed d'un ticket
 * (Prendre en charge / Terminer / Rejeter).
 * @param {number} ticketId
 * @returns {ActionRowBuilder}
 */
function construireBoutonsTicket(ticketId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(construireTicketCustomId(TICKET_TAKE_PREFIX, ticketId))
            .setLabel('Prendre en charge')
            .setEmoji('⚙️')
            .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
            .setCustomId(construireTicketCustomId(TICKET_COMPLETE_PREFIX, ticketId))
            .setLabel('Terminer')
            .setEmoji('✅')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(construireTicketCustomId(TICKET_REJECT_PREFIX, ticketId))
            .setLabel('Rejeter')
            .setEmoji('❌')
            .setStyle(ButtonStyle.Danger)
    );
}

/**
 * Construit la ligne de bouton affichée à la place des boutons d'action une fois
 * le ticket clôturé (résolu ou rejeté) : permet de supprimer définitivement le fil.
 * @param {number} ticketId
 * @returns {ActionRowBuilder}
 */
function construireBoutonSuppression(ticketId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(construireTicketCustomId(TICKET_DELETE_PREFIX, ticketId))
            .setLabel('Supprimer le fil')
            .setEmoji('🗑️')
            .setStyle(ButtonStyle.Danger)
    );
}

/**
 * Traite la soumission du Modal de création de demande :
 *  1. Valide le type de demande saisi par rapport à la configuration en base.
 *  2. Crée un Thread dans le salon cible du type.
 *  3. Enregistre le ticket en base de données.
 *  4. Envoie l'Embed récapitulatif + ping du rôle + boutons d'action dans le thread.
 *  5. Journalise la création dans le salon de logs configuré.
 *
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 */
async function gererSoumissionModal(interaction) {
    // On différe la réponse car la création du thread + les appels DB
    // peuvent dépasser les 3 secondes accordées par Discord.
    await interaction.deferReply({ ephemeral: true });

    try {
        const typeSaisi = interaction.fields.getTextInputValue(REQUEST_MODAL_FIELD_TYPE);
        const nomDemande = interaction.fields.getTextInputValue(REQUEST_MODAL_FIELD_NAME);
        const description = interaction.fields.getTextInputValue(REQUEST_MODAL_FIELD_DESCRIPTION);

        // 1. Validation du type de demande par rapport à la configuration en base
        const typeConfig = db.getTypeByName(typeSaisi);
        if (!typeConfig) {
            const typesDisponibles = db.getAllTypes().map((t) => `\`${t.name}\``);
            await interaction.editReply({
                content:
                    `❌ Le type de demande **"${typeSaisi}"** n'est pas configuré.\n` +
                    (typesDisponibles.length
                        ? `Types disponibles : ${typesDisponibles.join(', ')}`
                        : "Aucun type n'a encore été configuré par un administrateur."),
            });
            return;
        }

        // 2. Récupération et vérification du salon cible
        const salonCible = await interaction.guild.channels.fetch(typeConfig.target_channel_id).catch(() => null);
        if (!salonCible || salonCible.type !== ChannelType.GuildText) {
            await interaction.editReply({
                content:
                    '❌ Le salon cible configuré pour ce type de demande est introuvable ou invalide. ' +
                    'Merci de contacter un administrateur.',
            });
            return;
        }

        // 3. Création du Thread dédié à la demande
        const thread = await salonCible.threads.create({
            name: `${typeConfig.name} — ${nomDemande}`.slice(0, 100),
            autoArchiveDuration: 1440, // 24h d'inactivité avant archivage automatique
            reason: `Nouvelle demande créée par ${interaction.user.tag}`,
        });

        // 4. Enregistrement du ticket en base de données
        const ticket = db.createTicket({
            type_id: typeConfig.id,
            type_name: typeConfig.name,
            request_name: nomDemande,
            description,
            guild_id: interaction.guildId,
            channel_id: salonCible.id,
            thread_id: thread.id,
            author_id: interaction.user.id,
        });

        // 5. Envoi de l'Embed récapitulatif + ping du rôle + boutons d'action dans le thread
        const embedTicket = construireEmbedTicket(ticket);
        const boutonsAction = construireBoutonsTicket(ticket.id);

        await thread.send({
            content: `<@&${typeConfig.role_id}>`,
            embeds: [embedTicket],
            components: [boutonsAction],
        });

        // 6. Log de création dans le salon de logs configuré
        await envoyerLog(
            interaction.client,
            typeConfig.log_channel_id,
            '🆕 Nouvelle demande créée',
            `**Ticket #${ticket.id}** (${typeConfig.name}) créé par <@${interaction.user.id}>\n` +
                `Thread : <#${thread.id}>\nTitre : ${nomDemande}`,
            0x5865f2
        );

        // 7. Confirmation à l'utilisateur
        await interaction.editReply({
            content: `✅ Ta demande a bien été créée ! Rejoins la discussion ici : <#${thread.id}>`,
        });
    } catch (erreur) {
        console.error('[Modal] Erreur lors du traitement de la soumission :', erreur);
        await interaction.editReply({
            content: '❌ Une erreur est survenue lors de la création de ta demande. Merci de réessayer plus tard.',
        });
    }
}

module.exports = {
    construireModalDemande,
    construireBoutonsTicket,
    construireBoutonSuppression,
    gererSoumissionModal,
};
