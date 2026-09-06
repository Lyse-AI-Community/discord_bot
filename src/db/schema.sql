-- =========================================================================
-- Schéma SQLite du bot de gestion de demandes/tickets
-- =========================================================================

-- Table des "types de demande" configurés depuis le Dashboard Web.
-- Chaque type définit dans quel salon créer le thread, dans quel salon
-- envoyer les logs, et quel rôle pinger.
CREATE TABLE IF NOT EXISTS request_types (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    name              TEXT NOT NULL UNIQUE,     -- Nom du type (ex: "Visuel")
    target_channel_id TEXT NOT NULL,            -- Salon où créer le Thread
    log_channel_id    TEXT NOT NULL,            -- Salon des logs
    role_id           TEXT NOT NULL,            -- Rôle à pinger à la création
    manager_role_ids  TEXT NOT NULL DEFAULT '', -- Rôles additionnels autorisés à gérer ce type (IDs séparés par des virgules)
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table des tickets (demandes) créés par les membres via le Modal.
CREATE TABLE IF NOT EXISTS tickets (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    type_id       INTEGER,                      -- FK vers request_types.id (peut devenir NULL si le type est supprimé)
    type_name     TEXT NOT NULL,                -- Copie du nom du type au moment de la création (historique)
    request_name  TEXT NOT NULL,                -- Titre court de la demande
    description   TEXT NOT NULL,                -- Description détaillée
    guild_id      TEXT NOT NULL,                -- Serveur Discord concerné
    channel_id    TEXT NOT NULL,                -- Salon parent du thread
    thread_id     TEXT NOT NULL,                -- Thread créé pour cette demande
    author_id     TEXT NOT NULL,                -- Auteur de la demande
    assigned_to   TEXT,                         -- Membre qui a pris en charge la demande
    status        TEXT NOT NULL DEFAULT 'ouvert', -- ouvert | en_cours | resolu | rejete
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (type_id) REFERENCES request_types(id) ON DELETE SET NULL
);

-- Index utiles pour les recherches fréquentes
CREATE INDEX IF NOT EXISTS idx_tickets_thread_id ON tickets(thread_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_request_types_name ON request_types(name);
