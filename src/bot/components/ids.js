// =========================================================================
// Identifiants (customId) utilisés pour les boutons et modals de l'application.
// Centraliser ces constantes évite les erreurs de frappe entre les fichiers
// qui créent les composants et ceux qui traitent leurs interactions.
// =========================================================================

// Bouton du panneau fixe -> ouvre le Modal de création de demande
const CREATE_REQUEST_BUTTON_ID = 'create_request_btn';

// Modal de création de demande + noms de ses champs
const REQUEST_MODAL_ID = 'request_modal';
const REQUEST_MODAL_FIELD_TYPE = 'request_type';
const REQUEST_MODAL_FIELD_NAME = 'request_name';
const REQUEST_MODAL_FIELD_DESCRIPTION = 'request_description';

// Préfixes des boutons d'action sur un ticket (le suffixe est l'ID du ticket en base)
const TICKET_TAKE_PREFIX = 'ticket_take_';
const TICKET_COMPLETE_PREFIX = 'ticket_complete_';
const TICKET_REJECT_PREFIX = 'ticket_reject_';
// Bouton affiché uniquement une fois le ticket clôturé (résolu/rejeté) -> supprime le fil
const TICKET_DELETE_PREFIX = 'ticket_delete_';

/**
 * Construit le customId d'un bouton d'action de ticket.
 * @param {string} prefixe - Un des préfixes TICKET_*_PREFIX
 * @param {number} ticketId
 * @returns {string}
 */
function construireTicketCustomId(prefixe, ticketId) {
    return `${prefixe}${ticketId}`;
}

/**
 * Extrait l'ID numérique du ticket à partir d'un customId de bouton d'action.
 * @param {string} customId
 * @param {string} prefixe
 * @returns {number|null}
 */
function extraireTicketId(customId, prefixe) {
    if (!customId.startsWith(prefixe)) return null;
    const idBrut = customId.slice(prefixe.length);
    const id = parseInt(idBrut, 10);
    return Number.isNaN(id) ? null : id;
}

module.exports = {
    CREATE_REQUEST_BUTTON_ID,
    REQUEST_MODAL_ID,
    REQUEST_MODAL_FIELD_TYPE,
    REQUEST_MODAL_FIELD_NAME,
    REQUEST_MODAL_FIELD_DESCRIPTION,
    TICKET_TAKE_PREFIX,
    TICKET_COMPLETE_PREFIX,
    TICKET_REJECT_PREFIX,
    TICKET_DELETE_PREFIX,
    construireTicketCustomId,
    extraireTicketId,
};
