// =========================================================================
// Module d'accès à la base de données SQLite (better-sqlite3)
// Centralise toutes les requêtes utilisées par le Bot et le Dashboard Web.
// better-sqlite3 est synchrone : les requêtes sont donc toujours "à jour"
// sans nécessiter de cache ni de rechargement manuel côté bot.
// =========================================================================

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Chemin du fichier de base de données (créé automatiquement s'il n'existe pas)
const DB_PATH = path.join(__dirname, 'tickets.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Connexion à la base (le fichier est créé au premier lancement)
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL'); // Meilleures performances / robustesse en écriture concurrente

/**
 * Initialise le schéma de la base de données à partir de schema.sql.
 * Peut être appelée plusieurs fois sans risque (utilise CREATE TABLE IF NOT EXISTS).
 */
function initDatabase() {
    try {
        const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
        db.exec(schema);
        migrerSchema();
        console.log('[DB] Base de données initialisée avec succès.');
    } catch (erreur) {
        console.error('[DB] Erreur lors de l\'initialisation du schéma :', erreur);
        throw erreur;
    }
}

/**
 * Applique les migrations nécessaires sur une base existante créée avant
 * l'ajout de certaines colonnes (SQLite ne supporte pas "ADD COLUMN IF NOT EXISTS").
 */
function migrerSchema() {
    const colonnes = db.prepare('PRAGMA table_info(request_types)').all();
    const aLaColonne = colonnes.some((colonne) => colonne.name === 'manager_role_ids');
    if (!aLaColonne) {
        db.exec("ALTER TABLE request_types ADD COLUMN manager_role_ids TEXT NOT NULL DEFAULT ''");
        console.log('[DB] Migration : colonne "manager_role_ids" ajoutée à request_types.');
    }
}

/**
 * Normalise une entrée de rôles gestionnaires (chaîne "id1, id2" ou tableau)
 * en une chaîne unique d'IDs uniques séparés par des virgules, prête à être
 * stockée en base.
 * @param {string|string[]|undefined|null} entree
 * @returns {string}
 */
function normaliserRolesGestionnaires(entree) {
    if (!entree) return '';
    const liste = Array.isArray(entree) ? entree : String(entree).split(',');
    const nettoyee = liste.map((id) => String(id).trim()).filter(Boolean);
    return [...new Set(nettoyee)].join(',');
}

/**
 * Transforme la chaîne "id1,id2" stockée en base en tableau d'IDs.
 * @param {string|undefined|null} texte
 * @returns {string[]}
 */
function parseRolesGestionnaires(texte) {
    if (!texte) return [];
    return String(texte)
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
}

/**
 * Retourne la liste complète (dédupliquée) des rôles autorisés à gérer les
 * tickets d'un type de demande : le rôle à pinger + les rôles gestionnaires additionnels.
 * @param {Object|undefined} typeConfig - Ligne de la table `request_types`
 * @returns {string[]}
 */
function getRolesAutorises(typeConfig) {
    if (!typeConfig) return [];
    const roles = [typeConfig.role_id, ...parseRolesGestionnaires(typeConfig.manager_role_ids)];
    return [...new Set(roles.filter(Boolean))];
}

// -------------------------------------------------------------------------
// Requêtes préparées : Types de demande (request_types)
// -------------------------------------------------------------------------

/**
 * Récupère tous les types de demande, triés par nom.
 * @returns {Array<Object>}
 */
function getAllTypes() {
    try {
        return db.prepare('SELECT * FROM request_types ORDER BY name ASC').all();
    } catch (erreur) {
        console.error('[DB] Erreur getAllTypes :', erreur);
        return [];
    }
}

/**
 * Récupère un type de demande par son identifiant.
 * @param {number} id
 * @returns {Object|undefined}
 */
function getTypeById(id) {
    try {
        return db.prepare('SELECT * FROM request_types WHERE id = ?').get(id);
    } catch (erreur) {
        console.error('[DB] Erreur getTypeById :', erreur);
        return undefined;
    }
}

/**
 * Récupère un type de demande par son nom (recherche insensible à la casse/espaces).
 * @param {string} name
 * @returns {Object|undefined}
 */
function getTypeByName(name) {
    try {
        const nomNormalise = String(name).trim().toLowerCase();
        return db
            .prepare('SELECT * FROM request_types WHERE LOWER(TRIM(name)) = ?')
            .get(nomNormalise);
    } catch (erreur) {
        console.error('[DB] Erreur getTypeByName :', erreur);
        return undefined;
    }
}

/**
 * Crée un nouveau type de demande.
 * @param {{name: string, target_channel_id: string, log_channel_id: string, role_id: string, manager_role_ids?: string|string[]}} data
 * @returns {Object} Le type créé
 */
function createType(data) {
    const stmt = db.prepare(`
        INSERT INTO request_types (name, target_channel_id, log_channel_id, role_id, manager_role_ids)
        VALUES (@name, @target_channel_id, @log_channel_id, @role_id, @manager_role_ids)
    `);
    const resultat = stmt.run({
        ...data,
        manager_role_ids: normaliserRolesGestionnaires(data.manager_role_ids),
    });
    return getTypeById(resultat.lastInsertRowid);
}

/**
 * Met à jour un type de demande existant.
 * @param {number} id
 * @param {{name: string, target_channel_id: string, log_channel_id: string, role_id: string, manager_role_ids?: string|string[]}} data
 * @returns {Object|undefined} Le type mis à jour
 */
function updateType(id, data) {
    const stmt = db.prepare(`
        UPDATE request_types
        SET name = @name,
            target_channel_id = @target_channel_id,
            log_channel_id = @log_channel_id,
            role_id = @role_id,
            manager_role_ids = @manager_role_ids,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
    `);
    stmt.run({
        ...data,
        manager_role_ids: normaliserRolesGestionnaires(data.manager_role_ids),
        id,
    });
    return getTypeById(id);
}

/**
 * Supprime un type de demande.
 * @param {number} id
 * @returns {boolean} true si une ligne a été supprimée
 */
function deleteType(id) {
    const stmt = db.prepare('DELETE FROM request_types WHERE id = ?');
    const resultat = stmt.run(id);
    return resultat.changes > 0;
}

// -------------------------------------------------------------------------
// Requêtes préparées : Tickets (demandes)
// -------------------------------------------------------------------------

/**
 * Crée un nouveau ticket en base de données.
 * @param {Object} data
 * @returns {Object} Le ticket créé
 */
function createTicket(data) {
    const stmt = db.prepare(`
        INSERT INTO tickets (
            type_id, type_name, request_name, description,
            guild_id, channel_id, thread_id, author_id, status
        ) VALUES (
            @type_id, @type_name, @request_name, @description,
            @guild_id, @channel_id, @thread_id, @author_id, 'ouvert'
        )
    `);
    const resultat = stmt.run(data);
    return getTicketById(resultat.lastInsertRowid);
}

/**
 * Récupère un ticket par son identifiant interne.
 * @param {number} id
 * @returns {Object|undefined}
 */
function getTicketById(id) {
    try {
        return db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
    } catch (erreur) {
        console.error('[DB] Erreur getTicketById :', erreur);
        return undefined;
    }
}

/**
 * Récupère un ticket à partir de l'ID du thread Discord associé.
 * @param {string} threadId
 * @returns {Object|undefined}
 */
function getTicketByThreadId(threadId) {
    try {
        return db.prepare('SELECT * FROM tickets WHERE thread_id = ?').get(threadId);
    } catch (erreur) {
        console.error('[DB] Erreur getTicketByThreadId :', erreur);
        return undefined;
    }
}

/**
 * Met à jour le statut d'un ticket (et éventuellement le membre assigné).
 * @param {number} id
 * @param {string} status - 'ouvert' | 'en_cours' | 'resolu' | 'rejete'
 * @param {string|null} assignedTo - ID Discord du membre assigné (optionnel)
 * @returns {Object|undefined} Le ticket mis à jour
 */
function updateTicketStatus(id, status, assignedTo = undefined) {
    if (assignedTo === undefined) {
        db.prepare(`
            UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(status, id);
    } else {
        db.prepare(`
            UPDATE tickets SET status = ?, assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(status, assignedTo, id);
    }
    return getTicketById(id);
}

module.exports = {
    db,
    initDatabase,
    // Types de demande
    getAllTypes,
    getTypeById,
    getTypeByName,
    createType,
    updateType,
    deleteType,
    parseRolesGestionnaires,
    getRolesAutorises,
    // Tickets
    createTicket,
    getTicketById,
    getTicketByThreadId,
    updateTicketStatus,
};
