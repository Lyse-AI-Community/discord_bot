// =========================================================================
// Commande Slash : /setup-panel
// Envoie dans un salon (le salon courant ou un salon ciblé) un Embed fixe
// contenant un bouton "➕ Créer une demande" permettant d'ouvrir le Modal
// de création de ticket.
// =========================================================================

const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    ChannelType,
} = require('discord.js');
const { CREATE_REQUEST_BUTTON_ID } = require('../components/ids');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-panel')
        .setDescription("Publie le panneau de création de demandes dans un salon.")
        .addChannelOption((option) =>
            option
                .setName('salon')
                .setDescription('Salon où publier le panneau (par défaut : salon actuel)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    /**
     * Exécute la commande /setup-panel.
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     */
    async execute(interaction) {
        try {
            const salonCible = interaction.options.getChannel('salon') || interaction.channel;

            // Vérifie que le salon choisi est bien un salon textuel dans lequel le bot peut écrire
            if (!salonCible || !salonCible.isTextBased()) {
                await interaction.reply({
                    content: '❌ Le salon sélectionné est invalide ou non textuel.',
                    ephemeral: true,
                });
                return;
            }

            // Construction de l'Embed fixe du panneau
            const embedPanneau = new EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle('📨 Ouvrir une nouvelle demande')
                .setDescription(
                    "Clique sur le bouton ci-dessous pour soumettre une nouvelle demande " +
                        "(Visuel, Entraînement de l'IA ...).\n\n" +
                        "Un fil de discussion dédié sera créé automatiquement et l'équipe concernée sera notifiée."
                )
                .setFooter({ text: 'Système de gestion des demandes' })

            // Bouton de création de demande
            const ligneBoutons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(CREATE_REQUEST_BUTTON_ID)
                    .setLabel('➕ Créer une demande')
                    .setStyle(ButtonStyle.Primary)
            );

            await salonCible.send({ embeds: [embedPanneau], components: [ligneBoutons] });

            await interaction.reply({
                content: `✅ Panneau publié avec succès dans ${salonCible}.`,
                ephemeral: true,
            });
        } catch (erreur) {
            console.error('[Commande /setup-panel] Erreur :', erreur);
            await interaction.reply({
                content: "❌ Une erreur est survenue lors de la publication du panneau.",
                ephemeral: true,
            });
        }
    },
};
