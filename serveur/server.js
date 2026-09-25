const express = require("express");
const session = require("express-session");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

const SITE_FOLDER = path.join(__dirname, "..");
const DATA_FOLDER = path.join(__dirname, "data");

const TICKETS_FILE = path.join(DATA_FOLDER, "tickets.json");
const VIES_FILE = path.join(DATA_FOLDER, "vies.json");
const ANNONCES_FILE = path.join(DATA_FOLDER, "annonces.json");
const EVENEMENTS_FILE = path.join(DATA_FOLDER, "evenements.json");
const MEMBRES_FILE = path.join(DATA_FOLDER, "membres.json");
const PARAMETRES_FILE = path.join(DATA_FOLDER, "parametres.json");

const STAFF_PASSWORD = process.env.STAFF_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!STAFF_PASSWORD) {
    console.error(
        "ERREUR : STAFF_PASSWORD manque dans .env ou dans les variables Render."
    );
    process.exit(1);
}

if (!SESSION_SECRET) {
    console.error(
        "ERREUR : SESSION_SECRET manque dans .env ou dans les variables Render."
    );
    process.exit(1);
}

if (!fs.existsSync(DATA_FOLDER)) {
    fs.mkdirSync(DATA_FOLDER, {
        recursive: true
    });
}

/* =========================
   CREATION DES FICHIERS
========================= */

function createFileIfMissing(file, defaultValue) {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(
            file,
            JSON.stringify(defaultValue, null, 2),
            "utf8"
        );
    }
}

createFileIfMissing(TICKETS_FILE, []);
createFileIfMissing(VIES_FILE, []);
createFileIfMissing(ANNONCES_FILE, []);
createFileIfMissing(EVENEMENTS_FILE, []);
createFileIfMissing(MEMBRES_FILE, []);

createFileIfMissing(PARAMETRES_FILE, {
    nomSite: "BUSINESS.",
    slogan: "Construisons quelque chose de grand.",
    description: "Bienvenue sur BUSINESS.",
    discord: "",
    texteAccueil: "Bienvenue sur notre site.",
    maintenance: false
});

/* =========================
   EXPRESS
========================= */

app.set("trust proxy", 1);

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(
    session({
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 8 * 60 * 60 * 1000
        }
    })
);

/* =========================
   LECTURE JSON
========================= */

function readJSON(file, fallback = []) {
    try {
        const data = fs.readFileSync(
            file,
            "utf8"
        );

        return JSON.parse(data);
    } catch (error) {
        console.error(
            `Erreur lecture ${path.basename(file)} :`,
            error
        );

        return fallback;
    }
}

function saveJSON(file, data) {
    fs.writeFileSync(
        file,
        JSON.stringify(data, null, 2),
        "utf8"
    );
}

/* =========================
   OUTILS
========================= */

function clean(value) {
    return String(value ?? "").trim();
}

function requireStaff(req, res, next) {
    if (req.session.staff === true) {
        next();
        return;
    }

    res.status(401).json({
        success: false,
        message: "Accès réservé au Staff."
    });
}

function sendSuccess(res, message, extra = {}) {
    res.json({
        success: true,
        message,
        ...extra
    });
}

/* =========================
   TEST
========================= */

app.get("/api/test", (req, res) => {
    res.json({
        success: true,
        message: "Le serveur fonctionne !"
    });
});

/* =========================
   LOGIN
========================= */

app.post("/api/login", (req, res) => {
    const password = req.body?.password;

    if (password !== STAFF_PASSWORD) {
        return res.status(401).json({
            success: false,
            message: "Mot de passe incorrect."
        });
    }

    req.session.staff = true;

    sendSuccess(
        res,
        "Connexion réussie."
    );
});

/* =========================
   LOGOUT
========================= */

app.post("/api/logout", (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                success: false,
                message: "Erreur pendant la déconnexion."
            });
        }

        sendSuccess(
            res,
            "Déconnexion réussie."
        );
    });
});

/* =========================
   SESSION
========================= */

app.get("/api/session", (req, res) => {
    res.json({
        success: true,
        loggedIn: req.session.staff === true
    });
});

/* =========================================================
   TICKETS
========================================================= */

app.post("/api/tickets", (req, res) => {
    const {
        type,
        nom,
        discord,
        sujet,
        message
    } = req.body;

    if (
        !type ||
        !nom ||
        !discord ||
        !sujet ||
        !message
    ) {
        return res.status(400).json({
            success: false,
            message: "Tous les champs sont obligatoires."
        });
    }

    const tickets = readJSON(
        TICKETS_FILE,
        []
    );

    const ticket = {
        id: Date.now(),
        type: clean(type),
        nom: clean(nom),
        discord: clean(discord),
        sujet: clean(sujet),
        message: clean(message),
        date: new Date().toISOString(),
        status: "Nouveau"
    };

    tickets.push(ticket);

    saveJSON(
        TICKETS_FILE,
        tickets
    );

    console.log(
        "NOUVEAU TICKET :",
        ticket.id
    );

    sendSuccess(
        res,
        "Formulaire envoyé avec succès."
    );
});

app.get(
    "/api/tickets",
    requireStaff,
    (req, res) => {
        const tickets = readJSON(
            TICKETS_FILE,
            []
        );

        res.json({
            success: true,
            tickets: [...tickets].reverse()
        });
    }
);

app.patch(
    "/api/tickets/:id",
    requireStaff,
    (req, res) => {
        const id = Number(req.params.id);
        const { status } = req.body;

        const tickets = readJSON(
            TICKETS_FILE,
            []
        );

        const ticket = tickets.find(
            item => item.id === id
        );

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: "Formulaire introuvable."
            });
        }

        ticket.status = clean(status);

        saveJSON(
            TICKETS_FILE,
            tickets
        );

        res.json({
            success: true,
            ticket
        });
    }
);

app.delete(
    "/api/tickets/:id",
    requireStaff,
    (req, res) => {
        const id = Number(req.params.id);

        const tickets = readJSON(
            TICKETS_FILE,
            []
        );

        const newTickets = tickets.filter(
            ticket => ticket.id !== id
        );

        if (
            newTickets.length === tickets.length
        ) {
            return res.status(404).json({
                success: false,
                message: "Formulaire introuvable."
            });
        }

        saveJSON(
            TICKETS_FILE,
            newTickets
        );

        sendSuccess(
            res,
            "Formulaire supprimé."
        );
    }
);

/* =========================================================
   FICHES DE VIE
========================================================= */

app.post("/api/vies", (req, res) => {
    const {
        prenom,
        genre,
        age,
        discord,
        histoire
    } = req.body;

    if (
        !prenom ||
        !genre ||
        !age ||
        !discord ||
        !histoire
    ) {
        return res.status(400).json({
            success: false,
            message: "Tous les champs sont obligatoires."
        });
    }

    const vies = readJSON(
        VIES_FILE,
        []
    );

    const vie = {
        id: Date.now(),
        prenom: clean(prenom),
        genre: clean(genre),
        age: clean(age),
        discord: clean(discord),
        histoire: clean(histoire),
        date: new Date().toISOString(),
        status: "Nouveau"
    };

    vies.push(vie);

    saveJSON(
        VIES_FILE,
        vies
    );

    console.log(
        "NOUVELLE FICHE DE VIE :",
        vie.id
    );

    sendSuccess(
        res,
        "Présentation envoyée avec succès."
    );
});

app.get(
    "/api/vies",
    requireStaff,
    (req, res) => {
        const vies = readJSON(
            VIES_FILE,
            []
        );

        res.json({
            success: true,
            vies: [...vies].reverse()
        });
    }
);

app.patch(
    "/api/vies/:id",
    requireStaff,
    (req, res) => {
        const id = Number(req.params.id);
        const { status } = req.body;

        const vies = readJSON(
            VIES_FILE,
            []
        );

        const vie = vies.find(
            item => item.id === id
        );

        if (!vie) {
            return res.status(404).json({
                success: false,
                message: "Fiche de vie introuvable."
            });
        }

        vie.status = clean(status);

        saveJSON(
            VIES_FILE,
            vies
        );

        res.json({
            success: true,
            vie
        });
    }
);

app.delete(
    "/api/vies/:id",
    requireStaff,
    (req, res) => {
        const id = Number(req.params.id);

        const vies = readJSON(
            VIES_FILE,
            []
        );

        const newVies = vies.filter(
            vie => vie.id !== id
        );

        if (
            newVies.length === vies.length
        ) {
            return res.status(404).json({
                success: false,
                message: "Fiche de vie introuvable."
            });
        }

        saveJSON(
            VIES_FILE,
            newVies
        );

        sendSuccess(
            res,
            "Fiche de vie supprimée."
        );
    }
);

/* =========================================================
   ANNONCES
========================================================= */

app.get(
    "/api/annonces",
    (req, res) => {
        const annonces = readJSON(
            ANNONCES_FILE,
            []
        );

        res.json({
            success: true,
            annonces: [...annonces].reverse()
        });
    }
);

app.post(
    "/api/annonces",
    requireStaff,
    (req, res) => {
        const {
            titre,
            contenu,
            important
        } = req.body;

        if (
            !titre ||
            !contenu
        ) {
            return res.status(400).json({
                success: false,
                message: "Le titre et le contenu sont obligatoires."
            });
        }

        const annonces = readJSON(
            ANNONCES_FILE,
            []
        );

        const annonce = {
            id: Date.now(),
            titre: clean(titre),
            contenu: clean(contenu),
            important: Boolean(important),
            date: new Date().toISOString()
        };

        annonces.push(annonce);

        saveJSON(
            ANNONCES_FILE,
            annonces
        );

        sendSuccess(
            res,
            "Annonce créée.",
            {
                annonce
            }
        );
    }
);

app.patch(
    "/api/annonces/:id",
    requireStaff,
    (req, res) => {
        const id = Number(req.params.id);

        const annonces = readJSON(
            ANNONCES_FILE,
            []
        );

        const annonce = annonces.find(
            item => item.id === id
        );

        if (!annonce) {
            return res.status(404).json({
                success: false,
                message: "Annonce introuvable."
            });
        }

        if (req.body.titre !== undefined) {
            annonce.titre = clean(
                req.body.titre
            );
        }

        if (req.body.contenu !== undefined) {
            annonce.contenu = clean(
                req.body.contenu
            );
        }

        if (req.body.important !== undefined) {
            annonce.important =
                Boolean(req.body.important);
        }

        saveJSON(
            ANNONCES_FILE,
            annonces
        );

        res.json({
            success: true,
            annonce
        });
    }
);

app.delete(
    "/api/annonces/:id",
    requireStaff,
    (req, res) => {
        const id = Number(req.params.id);

        const annonces = readJSON(
            ANNONCES_FILE,
            []
        );

        const newAnnonces = annonces.filter(
            annonce => annonce.id !== id
        );

        if (
            newAnnonces.length === annonces.length
        ) {
            return res.status(404).json({
                success: false,
                message: "Annonce introuvable."
            });
        }

        saveJSON(
            ANNONCES_FILE,
            newAnnonces
        );

        sendSuccess(
            res,
            "Annonce supprimée."
        );
    }
);

/* =========================================================
   EVENEMENTS
========================================================= */

app.get(
    "/api/evenements",
    (req, res) => {
        const evenements = readJSON(
            EVENEMENTS_FILE,
            []
        );

        res.json({
            success: true,
            evenements: [...evenements].reverse()
        });
    }
);

app.post(
    "/api/evenements",
    requireStaff,
    (req, res) => {
        const {
            titre,
            dateEvenement,
            heure,
            description,
            lieu
        } = req.body;

        if (
            !titre ||
            !dateEvenement ||
            !description
        ) {
            return res.status(400).json({
                success: false,
                message: "Le titre, la date et la description sont obligatoires."
            });
        }

        const evenements = readJSON(
            EVENEMENTS_FILE,
            []
        );

        const evenement = {
            id: Date.now(),
            titre: clean(titre),
            dateEvenement: clean(dateEvenement),
            heure: clean(heure),
            description: clean(description),
            lieu: clean(lieu),
            dateCreation: new Date().toISOString()
        };

        evenements.push(evenement);

        saveJSON(
            EVENEMENTS_FILE,
            evenements
        );

        sendSuccess(
            res,
            "Événement créé.",
            {
                evenement
            }
        );
    }
);

app.patch(
    "/api/evenements/:id",
    requireStaff,
    (req, res) => {
        const id = Number(req.params.id);

        const evenements = readJSON(
            EVENEMENTS_FILE,
            []
        );

        const evenement = evenements.find(
            item => item.id === id
        );

        if (!evenement) {
            return res.status(404).json({
                success: false,
                message: "Événement introuvable."
            });
        }

        if (req.body.titre !== undefined) {
            evenement.titre = clean(
                req.body.titre
            );
        }

        if (req.body.dateEvenement !== undefined) {
            evenement.dateEvenement = clean(
                req.body.dateEvenement
            );
        }

        if (req.body.heure !== undefined) {
            evenement.heure = clean(
                req.body.heure
            );
        }

        if (req.body.description !== undefined) {
            evenement.description = clean(
                req.body.description
            );
        }

        if (req.body.lieu !== undefined) {
            evenement.lieu = clean(
                req.body.lieu
            );
        }

        saveJSON(
            EVENEMENTS_FILE,
            evenements
        );

        res.json({
            success: true,
            evenement
        });
    }
);

app.delete(
    "/api/evenements/:id",
    requireStaff,
    (req, res) => {
        const id = Number(req.params.id);

        const evenements = readJSON(
            EVENEMENTS_FILE,
            []
        );

        const newEvenements = evenements.filter(
            evenement => evenement.id !== id
        );

        if (
            newEvenements.length === evenements.length
        ) {
            return res.status(404).json({
                success: false,
                message: "Événement introuvable."
            });
        }

        saveJSON(
            EVENEMENTS_FILE,
            newEvenements
        );

        sendSuccess(
            res,
            "Événement supprimé."
        );
    }
);

/* =========================================================
   MEMBRES
========================================================= */

app.get(
    "/api/membres",
    (req, res) => {
        const membres = readJSON(
            MEMBRES_FILE,
            []
        );

        res.json({
            success: true,
            membres
        });
    }
);

app.post(
    "/api/membres",
    requireStaff,
    (req, res) => {
        const {
            pseudo,
            discord,
            role,
            description
        } = req.body;

        if (
            !pseudo ||
            !discord ||
            !role
        ) {
            return res.status(400).json({
                success: false,
                message: "Le pseudo, Discord et le rôle sont obligatoires."
            });
        }

        const membres = readJSON(
            MEMBRES_FILE,
            []
        );

        const membre = {
            id: Date.now(),
            pseudo: clean(pseudo),
            discord: clean(discord),
            role: clean(role),
            description: clean(description),
            date: new Date().toISOString()
        };

        membres.push(membre);

        saveJSON(
            MEMBRES_FILE,
            membres
        );

        sendSuccess(
            res,
            "Membre ajouté.",
            {
                membre
            }
        );
    }
);

app.patch(
    "/api/membres/:id",
    requireStaff,
    (req, res) => {
        const id = Number(req.params.id);

        const membres = readJSON(
            MEMBRES_FILE,
            []
        );

        const membre = membres.find(
            item => item.id === id
        );

        if (!membre) {
            return res.status(404).json({
                success: false,
                message: "Membre introuvable."
            });
        }

        if (req.body.pseudo !== undefined) {
            membre.pseudo = clean(
                req.body.pseudo
            );
        }

        if (req.body.discord !== undefined) {
            membre.discord = clean(
                req.body.discord
            );
        }

        if (req.body.role !== undefined) {
            membre.role = clean(
                req.body.role
            );
        }

        if (req.body.description !== undefined) {
            membre.description = clean(
                req.body.description
            );
        }

        saveJSON(
            MEMBRES_FILE,
            membres
        );

        res.json({
            success: true,
            membre
        });
    }
);

app.delete(
    "/api/membres/:id",
    requireStaff,
    (req, res) => {
        const id = Number(req.params.id);

        const membres = readJSON(
            MEMBRES_FILE,
            []
        );

        const newMembres = membres.filter(
            membre => membre.id !== id
        );

        if (
            newMembres.length === membres.length
        ) {
            return res.status(404).json({
                success: false,
                message: "Membre introuvable."
            });
        }

        saveJSON(
            MEMBRES_FILE,
            newMembres
        );

        sendSuccess(
            res,
            "Membre supprimé."
        );
    }
);

/* =========================================================
   PARAMETRES DU SITE
========================================================= */

app.get(
    "/api/parametres",
    (req, res) => {
        const parametres = readJSON(
            PARAMETRES_FILE,
            {}
        );

        res.json({
            success: true,
            parametres
        });
    }
);

app.patch(
    "/api/parametres",
    requireStaff,
    (req, res) => {
        const parametres = readJSON(
            PARAMETRES_FILE,
            {}
        );

        const fields = [
            "nomSite",
            "slogan",
            "description",
            "discord",
            "texteAccueil",
            "maintenance"
        ];

        for (const field of fields) {

            if (req.body[field] !== undefined) {

                if (field === "maintenance") {
                    parametres[field] =
                        Boolean(req.body[field]);
                } else {
                    parametres[field] =
                        clean(req.body[field]);
                }
            }
        }

        saveJSON(
            PARAMETRES_FILE,
            parametres
        );

        res.json({
            success: true,
            parametres
        });
    }
);

/* =========================================================
   PAGE STAFF
========================================================= */

app.get(
    "/staff.html",
    (req, res) => {

        if (req.session.staff !== true) {
            return res.redirect(
                "/staff-login.html"
            );
        }

        res.sendFile(
            path.join(
                SITE_FOLDER,
                "staff.html"
            )
        );
    }
);

/* =========================================================
   FICHIERS DU SITE
========================================================= */

app.use(
    express.static(SITE_FOLDER)
);

/* =========================================================
   SERVEUR
========================================================= */

app.listen(
    PORT,
    HOST,
    () => {

        console.log("");
        console.log("=================================");
        console.log("      BUSINESS. - SERVEUR");
        console.log("=================================");
        console.log("");
        console.log(
            `Serveur lancé sur le port ${PORT}`
        );
        console.log(
            `HOST utilisé : ${HOST}`
        );
        console.log("");
    }
);