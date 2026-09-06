// =========================================================================
// Routes d'authentification du Dashboard (connexion par mot de passe simple)
// =========================================================================

const express = require('express');
const router = express.Router();

/**
 * Middleware protégeant les routes du Dashboard : redirige vers /login
 * si l'utilisateur n'est pas authentifié (session).
 */
function requireAuth(req, res, next) {
    if (req.session && req.session.estAuthentifie) {
        return next();
    }
    return res.redirect('/login');
}

// Affiche le formulaire de connexion
router.get('/login', (req, res) => {
    if (req.session?.estAuthentifie) {
        return res.redirect('/');
    }
    res.render('login', { erreur: null });
});

// Traite la soumission du formulaire de connexion
router.post('/login', (req, res) => {
    const { password } = req.body;

    if (!process.env.ADMIN_PASSWORD) {
        console.error("[Auth] ADMIN_PASSWORD n'est pas défini dans le fichier .env !");
        return res.status(500).render('login', {
            erreur: "Le mot de passe administrateur n'est pas configuré côté serveur.",
        });
    }

    if (password && password === process.env.ADMIN_PASSWORD) {
        req.session.estAuthentifie = true;
        return res.redirect('/');
    }

    return res.status(401).render('login', { erreur: 'Mot de passe incorrect.' });
});

// Déconnexion : détruit la session
router.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

module.exports = { router, requireAuth };
