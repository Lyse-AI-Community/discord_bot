// =========================================================================
// Chargeur de commandes Slash
// Exporte la liste de toutes les commandes disponibles dans src/bot/commands/
// =========================================================================

const fs = require('fs');
const path = require('path');

const commandes = [];
const fichiers = fs
    .readdirSync(__dirname)
    .filter((fichier) => fichier.endsWith('.js') && fichier !== 'index.js');

for (const fichier of fichiers) {
    const commande = require(path.join(__dirname, fichier));
    if (commande?.data && typeof commande.execute === 'function') {
        commandes.push(commande);
    } else {
        console.warn(`[Commandes] Le fichier ${fichier} est ignoré (structure invalide).`);
    }
}

module.exports = commandes;
