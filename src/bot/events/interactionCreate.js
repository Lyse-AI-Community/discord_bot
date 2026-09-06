// =========================================================================
// Événement "interactionCreate" : point d'entrée unique de toutes les
// interactions Discord (commandes Slash, boutons, soumissions de Modal).
// Ce fichier ne contient que la logique de dispatch ; le traitement métier
// est délégué aux modules spécialisés (commands/, components/).
// =========================================================================

const { CREATE_REQUEST_BUTTON_ID, gererBoutonPanneau, gererBoutonTicket } = require('../components/buttons');
const { gererSoumissionModal } = require('../components/modals');
const { REQUEST_MODAL_ID } = require('../components/ids');

module.exports = {
    name: 'interactionCreate',

    /**
     * @param {import('discord.js').Interaction} interaction
     */
    async execute(interaction) {
        try {
            // --- Commandes Slash --------------------------------------------------
            if (interaction.isChatInputCommand()) {
                const commande = interaction.client.commands.get(interaction.commandName);
                if (!commande) {
                    console.warn(`[Interaction] Commande inconnue reçue : ${interaction.commandName}`);
                    return;
                }
                await commande.execute(interaction);
                return;
            }

            // --- Boutons -------------------------------------------------------
            if (interaction.isButton()) {
                if (interaction.customId === CREATE_REQUEST_BUTTON_ID) {
                    await gererBoutonPanneau(interaction);
                } else {
                    await gererBoutonTicket(interaction);
                }
                return;
            }

            // --- Soumission de Modal --------------------------------------------
            if (interaction.isModalSubmit()) {
                if (interaction.customId === REQUEST_MODAL_ID) {
                    await gererSoumissionModal(interaction);
                }
                return;
            }
        } catch (erreur) {
            console.error('[Interaction] Erreur non gérée :', erreur);

            // Tentative de retour d'un message d'erreur générique à l'utilisateur
            const messageErreur = { content: '❌ Une erreur inattendue est survenue.', ephemeral: true };
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.followUp(messageErreur);
                } else if (interaction.isRepliable()) {
                    await interaction.reply(messageErreur);
                }
            } catch (erreurSecondaire) {
                console.error("[Interaction] Impossible d'envoyer le message d'erreur :", erreurSecondaire);
            }
        }
    },
};
