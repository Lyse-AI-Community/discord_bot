// =========================================================================
// Routes du Dashboard : gestion CRUD des "Types de demande"
// (Nom, Salon cible, Salon de logs, Rôle à pinger)
// Toutes les écritures sont immédiatement persistées en SQLite et relues
// directement par le bot (aucun cache, aucun redémarrage nécessaire).
// =========================================================================

const express = require('express');
const router = express.Router();
const db = require('../../db/database');

// Un ID Discord (snowflake) est une suite de 15 à 25 chiffres
const REGEX_SNOWFLAKE = /^\d{15,25}$/;

/**
 * Valide les champs d'un formulaire de type de demande.
 * @param {Object} body
 * @returns {string[]} Liste des messages d'erreur (vide si tout est valide)
 */
function validerChampsType(body) {
    const erreurs = [];
    const { name, target_channel_id, log_channel_id, role_id, manager_role_ids } = body;

    if (!name || !name.trim()) {
        erreurs.push('Le nom du type est requis.');
    }
    if (!REGEX_SNOWFLAKE.test(target_channel_id || '')) {
        erreurs.push("L'ID du salon cible doit être un identifiant Discord valide (uniquement des chiffres).");
    }
    if (!REGEX_SNOWFLAKE.test(log_channel_id || '')) {
        erreurs.push("L'ID du salon de logs doit être un identifiant Discord valide (uniquement des chiffres).");
    }
    if (!REGEX_SNOWFLAKE.test(role_id || '')) {
        erreurs.push("L'ID du rôle doit être un identifiant Discord valide (uniquement des chiffres).");
    }

    // Champ optionnel : plusieurs IDs de rôles séparés par des virgules
    const rolesGestionnaires = String(manager_role_ids || '')
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);
    const roleInvalide = rolesGestionnaires.find((r) => !REGEX_SNOWFLAKE.test(r));
    if (roleInvalide) {
        erreurs.push(
            `L'ID de rôle gestionnaire "${roleInvalide}" est invalide (identifiants Discord séparés par des virgules attendus).`
        );
    }

    return erreurs;
}

// Affiche le Dashboard principal (liste des types + formulaire d'ajout)
router.get('/', (req, res) => {
    const types = db.getAllTypes();
    res.render('dashboard', { types, erreurs: [], succes: req.query.succes || null });
});

// Crée un nouveau type de demande
router.post('/types', (req, res) => {
    const erreurs = validerChampsType(req.body);

    if (erreurs.length > 0) {
        const types = db.getAllTypes();
        return res.status(400).render('dashboard', { types, erreurs, succes: null });
    }

    try {
        const { name, target_channel_id, log_channel_id, role_id, manager_role_ids } = req.body;
        db.createType({
            name: name.trim(),
            target_channel_id: target_channel_id.trim(),
            log_channel_id: log_channel_id.trim(),
            role_id: role_id.trim(),
            manager_role_ids: manager_role_ids || '',
        });
        res.redirect('/?succes=Type de demande créé avec succès.');
    } catch (erreur) {
        console.error('[Dashboard] Erreur lors de la création du type :', erreur);
        const types = db.getAllTypes();
        const messageErreur = erreur.code === 'SQLITE_CONSTRAINT_UNIQUE'
            ? 'Un type de demande porte déjà ce nom.'
            : "Une erreur est survenue lors de l'enregistrement.";
        res.status(500).render('dashboard', { types, erreurs: [messageErreur], succes: null });
    }
});

// Met à jour un type de demande existant
router.post('/types/:id/update', (req, res) => {
    const { id } = req.params;
    const erreurs = validerChampsType(req.body);

    if (erreurs.length > 0) {
        const types = db.getAllTypes();
        return res.status(400).render('dashboard', { types, erreurs, succes: null });
    }

    try {
        const { name, target_channel_id, log_channel_id, role_id, manager_role_ids } = req.body;
        const typeMisAJour = db.updateType(Number(id), {
            name: name.trim(),
            target_channel_id: target_channel_id.trim(),
            log_channel_id: log_channel_id.trim(),
            role_id: role_id.trim(),
            manager_role_ids: manager_role_ids || '',
        });

        if (!typeMisAJour) {
            const types = db.getAllTypes();
            return res.status(404).render('dashboard', { types, erreurs: ['Type de demande introuvable.'], succes: null });
        }

        res.redirect('/?succes=Type de demande mis à jour avec succès.');
    } catch (erreur) {
        console.error('[Dashboard] Erreur lors de la mise à jour du type :', erreur);
        const types = db.getAllTypes();
        const messageErreur = erreur.code === 'SQLITE_CONSTRAINT_UNIQUE'
            ? 'Un type de demande porte déjà ce nom.'
            : "Une erreur est survenue lors de la mise à jour.";
        res.status(500).render('dashboard', { types, erreurs: [messageErreur], succes: null });
    }
});

// Supprime un type de demande
router.post('/types/:id/delete', (req, res) => {
    const { id } = req.params;

    try {
        const supprime = db.deleteType(Number(id));
        if (!supprime) {
            const types = db.getAllTypes();
            return res.status(404).render('dashboard', { types, erreurs: ['Type de demande introuvable.'], succes: null });
        }
        res.redirect('/?succes=Type de demande supprimé avec succès.');
    } catch (erreur) {
        console.error('[Dashboard] Erreur lors de la suppression du type :', erreur);
        const types = db.getAllTypes();
        res.status(500).render('dashboard', { types, erreurs: ["Une erreur est survenue lors de la suppression."], succes: null });
    }
});

module.exports = router;
