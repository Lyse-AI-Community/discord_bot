// =========================================================================
// Événement "ready" : déclenché une fois le bot connecté à Discord.
// Enregistre les commandes Slash (en mode Guild si GUILD_ID est défini,
// sinon en mode global) et configure le statut du bot.
// =========================================================================

const { REST, Routes, ActivityType } = require('discord.js');
const commands = require('../commands');

/**
 * Enregistre les commandes Slash auprès de l'API Discord.
 * @param {import('discord.js').Client} client
 */
async function enregistrerCommandes(client) {
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);
    const payload = commands.map((commande) => commande.data.toJSON());

    try {
        if (process.env.GUILD_ID) {
            // Mode "guild" : enregistrement instantané, pratique en développement
            await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
                body: payload,
            });
            console.log(`[Commandes] ${payload.length} commande(s) enregistrée(s) sur le serveur ${process.env.GUILD_ID}.`);
        } else {
            // Mode global : peut prendre jusqu'à 1h pour se propager sur tous les serveurs
            await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: payload });
            console.log(`[Commandes] ${payload.length} commande(s) enregistrée(s) globalement.`);
        }
    } catch (erreur) {
        console.error("[Commandes] Erreur lors de l'enregistrement des commandes Slash :", erreur);
    }
}

module.exports = {
    name: 'ready',
    once: true,

    /**
     * @param {import('discord.js').Client} client
     */
    async execute(client) {
        console.log(`[Bot] Connecté en tant que ${client.user.tag} (${client.guilds.cache.size} serveur(s)).`);

        client.user.setPresence({
            activities: [{ name: 'les demandes du serveur', type: ActivityType.Watching }],
            status: 'online',
        });

        await enregistrerCommandes(client);
    },
};
