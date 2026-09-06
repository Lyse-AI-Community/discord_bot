// =========================================================================
// Chargeur d'événements Discord
// Exporte la liste de tous les événements définis dans src/bot/events/
// =========================================================================

const fs = require('fs');
const path = require('path');

const evenements = [];
const fichiers = fs
    .readdirSync(__dirname)
    .filter((fichier) => fichier.endsWith('.js') && fichier !== 'index.js');

for (const fichier of fichiers) {
    const evenement = require(path.join(__dirname, fichier));
    if (evenement?.name && typeof evenement.execute === 'function') {
        evenements.push(evenement);
    } else {
        console.warn(`[Événements] Le fichier ${fichier} est ignoré (structure invalide).`);
    }
}

module.exports = evenements;
