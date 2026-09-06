// =========================================================================
// Initialisation du client Discord (discord.js v14)
// =========================================================================

const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const commands = require('./commands');
const events = require('./events');

/**
 * Crée et configure le client Discord.
 * Intents nécessaires :
 *  - Guilds              : accès aux salons/threads/rôles du serveur
 *  - GuildMembers        : résoudre les membres (assignation, mentions de rôle)
 *  - GuildMessages       : envoyer des messages dans les salons/threads
 * Partials.Channel est nécessaire pour manipuler correctement les threads.
 */
function creerClientDiscord() {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages,
        ],
        partials: [Partials.Channel],
    });

    // Collection contenant toutes les commandes Slash chargées (clé = nom de la commande)
    client.commands = new Collection();
    for (const commande of commands) {
        client.commands.set(commande.data.name, commande);
    }

    // Enregistrement des gestionnaires d'événements Discord
    for (const evenement of events) {
        if (evenement.once) {
            client.once(evenement.name, (...args) => evenement.execute(...args));
        } else {
            client.on(evenement.name, (...args) => evenement.execute(...args));
        }
    }

    return client;
}

module.exports = { creerClientDiscord };
