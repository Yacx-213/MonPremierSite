const express = require("express");
const session = require("express-session");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const crypto = require("crypto");

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

const CREATIONS_FILE = path.join(
    DATA_FOLDER,
    "creations.json"
);

const MESSAGES_FILE = path.join(
    DATA_FOLDER,
    "messages.json"
);

const UPLOADS_FOLDER = path.join(
    SITE_FOLDER,
    "uploads",
    "creativite"
);

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

if (!fs.existsSync(UPLOADS_FOLDER)) {
    fs.mkdirSync(UPLOADS_FOLDER, {
        recursive: true
    });
}

/* =========================================================
   CREATION DES FICHIERS
========================================================= */

function createFileIfMissing(file, defaultValue) {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(
            file,
            JSON.stringify(
                defaultValue,
                null,
                2
            ),
            "utf8"
        );
    }
}

createFileIfMissing(
    TICKETS_FILE,
    []
);

createFileIfMissing(
    VIES_FILE,
    []
);

createFileIfMissing(
    ANNONCES_FILE,
    []
);

createFileIfMissing(
    EVENEMENTS_FILE,
    []
);

createFileIfMissing(
    MEMBRES_FILE,
    []
);

createFileIfMissing(
    CREATIONS_FILE,
    []
);

createFileIfMissing(
    MESSAGES_FILE,
    []
);

createFileIfMissing(
    PARAMETRES_FILE,
    {
        nomSite: "BUSINESS.",
        slogan: "Construisons quelque chose de grand.",
        description: "Bienvenue sur BUSINESS.",
        discord: "",
        texteAccueil: "Bienvenue sur notre site.",
        maintenance: false
    }
);

/* =========================================================
   EXPRESS
========================================================= */

app.set(
    "trust proxy",
    1
);

app.use(
    express.json({
        limit: "1mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "1mb"
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
            secure:
                process.env.NODE_ENV === "production",
            maxAge:
                8 * 60 * 60 * 1000
        }
    })
);

/* =========================================================
   MULTER — IMAGES CREATIVITE
========================================================= */

const storage =
    multer.diskStorage({

        destination: (
            req,
            file,
            callback
        ) => {

            callback(
                null,
                UPLOADS_FOLDER
            );
        },

        filename: (
            req,
            file,
            callback
        ) => {

            const extension =
                path.extname(
                    file.originalname
                ).toLowerCase();

            const safeExtension =
                [
                    ".jpg",
                    ".jpeg",
                    ".png",
                    ".gif",
                    ".webp"
                ].includes(
                    extension
                )
                    ? extension
                    : ".png";

            const filename =
                `${Date.now()}-${crypto.randomUUID()}${safeExtension}`;

            callback(
                null,
                filename
            );
        }
    });

const imageUpload =
    multer({

        storage,

        limits: {
            fileSize:
                5 * 1024 * 1024
        },

        fileFilter: (
            req,
            file,
            callback
        ) => {

            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "image/gif",
                "image/webp"
            ];

            if (
                allowedTypes.includes(
                    file.mimetype
                )
            ) {
                callback(
                    null,
                    true
                );

                return;
            }

            callback(
                new Error(
                    "Type d'image non autorisé. Utilise JPG, PNG, GIF ou WebP."
                )
            );
        }
    });

/* =========================================================
   OUTILS
========================================================= */

function readJSON(
    file,
    fallback = []
) {

    try {

        const data =
            fs.readFileSync(
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

function saveJSON(
    file,
    data
) {

    fs.writeFileSync(
        file,
        JSON.stringify(
            data,
            null,
            2
        ),
        "utf8"
    );
}

function clean(value) {

    return String(
        value ?? ""
    ).trim();
}

function requireStaff(
    req,
    res,
    next
) {

    if (
        req.session.staff === true
    ) {

        next();

        return;
    }

    res.status(401).json({
        success: false,
        message:
            "Accès réservé au Staff."
    });
}

function sendSuccess(
    res,
    message,
    extra = {}
) {

    res.json({
        success: true,
        message,
        ...extra
    });
}

/* =========================================================
   TEST
========================================================= */

app.get(
    "/api/test",
    (req, res) => {

        res.json({
            success: true,
            message:
                "Le serveur fonctionne !"
        });
    }
);

/* =========================================================
   LOGIN
========================================================= */

app.post(
    "/api/login",
    (req, res) => {

        const password =
            req.body?.password;

        if (
            password !==
            STAFF_PASSWORD
        ) {

            return res
                .status(401)
                .json({
                    success: false,
                    message:
                        "Mot de passe incorrect."
                });
        }

        req.session.staff =
            true;

        sendSuccess(
            res,
            "Connexion réussie."
        );
    }
);

/* =========================================================
   LOGOUT
========================================================= */

app.post(
    "/api/logout",
    (req, res) => {

        req.session.destroy(
            error => {

                if (error) {

                    return res
                        .status(500)
                        .json({
                            success: false,
                            message:
                                "Erreur pendant la déconnexion."
                        });
                }

                sendSuccess(
                    res,
                    "Déconnexion réussie."
                );
            }
        );
    }
);

/* =========================================================
   SESSION
========================================================= */

app.get(
    "/api/session",
    (req, res) => {

        res.json({
            success: true,
            loggedIn:
                req.session.staff === true
        });
    }
);

/* =========================================================
   TICKETS
========================================================= */

app.post(
    "/api/tickets",
    (req, res) => {

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

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Tous les champs sont obligatoires."
                });
        }

        const tickets =
            readJSON(
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
            date:
                new Date().toISOString(),
            status:
                "Nouveau"
        };

        tickets.push(
            ticket
        );

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
    }
);

app.get(
    "/api/tickets",
    requireStaff,
    (req, res) => {

        const tickets =
            readJSON(
                TICKETS_FILE,
                []
            );

        res.json({
            success: true,
            tickets:
                [...tickets].reverse()
        });
    }
);

app.patch(
    "/api/tickets/:id",
    requireStaff,
    (req, res) => {

        const id =
            Number(req.params.id);

        const {
            status
        } = req.body;

        const tickets =
            readJSON(
                TICKETS_FILE,
                []
            );

        const ticket =
            tickets.find(
                item =>
                    item.id === id
            );

        if (!ticket) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Formulaire introuvable."
                });
        }

        ticket.status =
            clean(status);

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

        const id =
            Number(req.params.id);

        const tickets =
            readJSON(
                TICKETS_FILE,
                []
            );

        const newTickets =
            tickets.filter(
                ticket =>
                    ticket.id !== id
            );

        if (
            newTickets.length ===
            tickets.length
        ) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Formulaire introuvable."
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

app.post(
    "/api/vies",
    (req, res) => {

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

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Tous les champs sont obligatoires."
                });
        }

        const vies =
            readJSON(
                VIES_FILE,
                []
            );

        const vie = {
            id: Date.now(),
            prenom:
                clean(prenom),
            genre:
                clean(genre),
            age:
                clean(age),
            discord:
                clean(discord),
            histoire:
                clean(histoire),
            date:
                new Date().toISOString(),
            status:
                "Nouveau"
        };

        vies.push(
            vie
        );

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
    }
);

app.get(
    "/api/vies",
    requireStaff,
    (req, res) => {

        const vies =
            readJSON(
                VIES_FILE,
                []
            );

        res.json({
            success: true,
            vies:
                [...vies].reverse()
        });
    }
);

app.patch(
    "/api/vies/:id",
    requireStaff,
    (req, res) => {

        const id =
            Number(req.params.id);

        const {
            status
        } = req.body;

        const vies =
            readJSON(
                VIES_FILE,
                []
            );

        const vie =
            vies.find(
                item =>
                    item.id === id
            );

        if (!vie) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Fiche de vie introuvable."
                });
        }

        vie.status =
            clean(status);

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

        const id =
            Number(req.params.id);

        const vies =
            readJSON(
                VIES_FILE,
                []
            );

        const newVies =
            vies.filter(
                vie =>
                    vie.id !== id
            );

        if (
            newVies.length ===
            vies.length
        ) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Fiche de vie introuvable."
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

        const annonces =
            readJSON(
                ANNONCES_FILE,
                []
            );

        res.json({
            success: true,
            annonces:
                [...annonces].reverse()
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

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Le titre et le contenu sont obligatoires."
                });
        }

        const annonces =
            readJSON(
                ANNONCES_FILE,
                []
            );

        const annonce = {
            id: Date.now(),
            titre:
                clean(titre),
            contenu:
                clean(contenu),
            important:
                Boolean(important),
            date:
                new Date().toISOString()
        };

        annonces.push(
            annonce
        );

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

        const id =
            Number(req.params.id);

        const annonces =
            readJSON(
                ANNONCES_FILE,
                []
            );

        const annonce =
            annonces.find(
                item =>
                    item.id === id
            );

        if (!annonce) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Annonce introuvable."
                });
        }

        if (
            req.body.titre !==
            undefined
        ) {

            annonce.titre =
                clean(
                    req.body.titre
                );
        }

        if (
            req.body.contenu !==
            undefined
        ) {

            annonce.contenu =
                clean(
                    req.body.contenu
                );
        }

        if (
            req.body.important !==
            undefined
        ) {

            annonce.important =
                Boolean(
                    req.body.important
                );
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

        const id =
            Number(req.params.id);

        const annonces =
            readJSON(
                ANNONCES_FILE,
                []
            );

        const newAnnonces =
            annonces.filter(
                annonce =>
                    annonce.id !== id
            );

        if (
            newAnnonces.length ===
            annonces.length
        ) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Annonce introuvable."
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

        const evenements =
            readJSON(
                EVENEMENTS_FILE,
                []
            );

        res.json({
            success: true,
            evenements:
                [...evenements].reverse()
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

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Le titre, la date et la description sont obligatoires."
                });
        }

        const evenements =
            readJSON(
                EVENEMENTS_FILE,
                []
            );

        const evenement = {
            id: Date.now(),
            titre:
                clean(titre),
            dateEvenement:
                clean(dateEvenement),
            heure:
                clean(heure),
            description:
                clean(description),
            lieu:
                clean(lieu),
            dateCreation:
                new Date().toISOString()
        };

        evenements.push(
            evenement
        );

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

        const id =
            Number(req.params.id);

        const evenements =
            readJSON(
                EVENEMENTS_FILE,
                []
            );

        const evenement =
            evenements.find(
                item =>
                    item.id === id
            );

        if (!evenement) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Événement introuvable."
                });
        }

        if (
            req.body.titre !==
            undefined
        ) {

            evenement.titre =
                clean(
                    req.body.titre
                );
        }

        if (
            req.body.dateEvenement !==
            undefined
        ) {

            evenement.dateEvenement =
                clean(
                    req.body.dateEvenement
                );
        }

        if (
            req.body.heure !==
            undefined
        ) {

            evenement.heure =
                clean(
                    req.body.heure
                );
        }

        if (
            req.body.description !==
            undefined
        ) {

            evenement.description =
                clean(
                    req.body.description
                );
        }

        if (
            req.body.lieu !==
            undefined
        ) {

            evenement.lieu =
                clean(
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

        const id =
            Number(req.params.id);

        const evenements =
            readJSON(
                EVENEMENTS_FILE,
                []
            );

        const newEvenements =
            evenements.filter(
                evenement =>
                    evenement.id !== id
            );

        if (
            newEvenements.length ===
            evenements.length
        ) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Événement introuvable."
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

        const membres =
            readJSON(
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

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Le pseudo, Discord et le rôle sont obligatoires."
                });
        }

        const membres =
            readJSON(
                MEMBRES_FILE,
                []
            );

        const membre = {
            id: Date.now(),
            pseudo:
                clean(pseudo),
            discord:
                clean(discord),
            role:
                clean(role),
            description:
                clean(description),
            date:
                new Date().toISOString()
        };

        membres.push(
            membre
        );

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

        const id =
            Number(req.params.id);

        const membres =
            readJSON(
                MEMBRES_FILE,
                []
            );

        const membre =
            membres.find(
                item =>
                    item.id === id
            );

        if (!membre) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Membre introuvable."
                });
        }

        if (
            req.body.pseudo !==
            undefined
        ) {

            membre.pseudo =
                clean(
                    req.body.pseudo
                );
        }

        if (
            req.body.discord !==
            undefined
        ) {

            membre.discord =
                clean(
                    req.body.discord
                );
        }

        if (
            req.body.role !==
            undefined
        ) {

            membre.role =
                clean(
                    req.body.role
                );
        }

        if (
            req.body.description !==
            undefined
        ) {

            membre.description =
                clean(
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

        const id =
            Number(req.params.id);

        const membres =
            readJSON(
                MEMBRES_FILE,
                []
            );

        const newMembres =
            membres.filter(
                membre =>
                    membre.id !== id
            );

        if (
            newMembres.length ===
            membres.length
        ) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Membre introuvable."
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
   PARAMETRES
========================================================= */

app.get(
    "/api/parametres",
    (req, res) => {

        const parametres =
            readJSON(
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

        const parametres =
            readJSON(
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

        for (
            const field
            of fields
        ) {

            if (
                req.body[field] !==
                undefined
            ) {

                if (
                    field ===
                    "maintenance"
                ) {

                    parametres[field] =
                        Boolean(
                            req.body[field]
                        );

                } else {

                    parametres[field] =
                        clean(
                            req.body[field]
                        );
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
   🎨 CREATIVITE — CREATIONS
========================================================= */

/*
    GET PUBLIC
    Tout le monde peut voir les créations.
*/

app.get(
    "/api/creativite/creations",
    (req, res) => {

        const creations =
            readJSON(
                CREATIONS_FILE,
                []
            );

        res.json({
            success: true,
            creations:
                [...creations].reverse()
        });
    }
);

/*
    POST PUBLIC
    Un membre peut publier une création.
*/

app.post(
    "/api/creativite/creations",
    imageUpload.single("image"),
    (req, res) => {

        try {

            const {
                pseudo,
                titre,
                description
            } = req.body;

            if (
                !pseudo ||
                !titre ||
                !description
            ) {

                if (
                    req.file &&
                    fs.existsSync(
                        req.file.path
                    )
                ) {

                    fs.unlinkSync(
                        req.file.path
                    );
                }

                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Le pseudo, le titre et la description sont obligatoires."
                    });
            }

            if (!req.file) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Tu dois sélectionner une image."
                    });
            }

            if (
                clean(pseudo).length >
                40
            ) {

                fs.unlinkSync(
                    req.file.path
                );

                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Le pseudo est trop long."
                    });
            }

            if (
                clean(titre).length >
                100
            ) {

                fs.unlinkSync(
                    req.file.path
                );

                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "Le titre est trop long."
                    });
            }

            if (
                clean(description).length >
                1000
            ) {

                fs.unlinkSync(
                    req.file.path
                );

                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "La description est trop longue."
                    });
            }

            const creations =
                readJSON(
                    CREATIONS_FILE,
                    []
                );

            const creation = {

                id: Date.now(),

                pseudo:
                    clean(pseudo),

                titre:
                    clean(titre),

                description:
                    clean(description),

                image:
                    "/uploads/creativite/" +
                    req.file.filename,

                fichier:
                    req.file.filename,

                date:
                    new Date().toISOString()
            };

            creations.push(
                creation
            );

            saveJSON(
                CREATIONS_FILE,
                creations
            );

            console.log(
                "NOUVELLE CREATION :",
                creation.id
            );

            sendSuccess(
                res,
                "Création publiée.",
                {
                    creation
                }
            );

        } catch (error) {

            console.error(
                "Erreur création :",
                error
            );

            if (
                req.file &&
                fs.existsSync(
                    req.file.path
                )
            ) {

                fs.unlinkSync(
                    req.file.path
                );
            }

            res
                .status(500)
                .json({
                    success: false,
                    message:
                        "Impossible de publier la création."
                });
        }
    }
);

/*
    DELETE STAFF
*/

app.delete(
    "/api/creativite/creations/:id",
    requireStaff,
    (req, res) => {

        const id =
            Number(req.params.id);

        const creations =
            readJSON(
                CREATIONS_FILE,
                []
            );

        const creation =
            creations.find(
                item =>
                    item.id === id
            );

        if (!creation) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Création introuvable."
                });
        }

        const newCreations =
            creations.filter(
                item =>
                    item.id !== id
            );

        saveJSON(
            CREATIONS_FILE,
            newCreations
        );

        if (
            creation.fichier
        ) {

            const imagePath =
                path.join(
                    UPLOADS_FOLDER,
                    creation.fichier
                );

            if (
                fs.existsSync(
                    imagePath
                )
            ) {

                try {

                    fs.unlinkSync(
                        imagePath
                    );

                } catch (error) {

                    console.error(
                        "Impossible de supprimer l'image :",
                        error
                    );
                }
            }
        }

        sendSuccess(
            res,
            "Création supprimée."
        );
    }
);

/* =========================================================
   💬 CREATIVITE — CHAT
========================================================= */

/*
    GET PUBLIC
*/

app.get(
    "/api/creativite/messages",
    (req, res) => {

        const messages =
            readJSON(
                MESSAGES_FILE,
                []
            );

        res.json({
            success: true,
            messages:
                messages.slice(-100)
        });
    }
);

/*
    POST PUBLIC
*/

app.post(
    "/api/creativite/messages",
    (req, res) => {

        const {
            pseudo,
            message
        } = req.body;

        const cleanPseudo =
            clean(pseudo);

        const cleanMessage =
            clean(message);

        if (
            !cleanPseudo ||
            !cleanMessage
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Le pseudo et le message sont obligatoires."
                });
        }

        if (
            cleanPseudo.length >
            40
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Le pseudo est trop long."
                });
        }

        if (
            cleanMessage.length >
            500
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Le message est trop long."
                });
        }

        const messages =
            readJSON(
                MESSAGES_FILE,
                []
            );

        const newMessage = {

            id: Date.now(),

            pseudo:
                cleanPseudo,

            message:
                cleanMessage,

            date:
                new Date().toISOString()
        };

        messages.push(
            newMessage
        );

        /*
            On garde seulement
            les 300 derniers messages.
        */

        const limitedMessages =
            messages.slice(-300);

        saveJSON(
            MESSAGES_FILE,
            limitedMessages
        );

        sendSuccess(
            res,
            "Message envoyé.",
            {
                message:
                    newMessage
            }
        );
    }
);

/*
    DELETE MESSAGE STAFF
*/

app.delete(
    "/api/creativite/messages/:id",
    requireStaff,
    (req, res) => {

        const id =
            Number(req.params.id);

        const messages =
            readJSON(
                MESSAGES_FILE,
                []
            );

        const newMessages =
            messages.filter(
                item =>
                    item.id !== id
            );

        if (
            newMessages.length ===
            messages.length
        ) {

            return res
                .status(404)
                .json({
                    success: false,
                    message:
                        "Message introuvable."
                });
        }

        saveJSON(
            MESSAGES_FILE,
            newMessages
        );

        sendSuccess(
            res,
            "Message supprimé."
        );
    }
);

/* =========================================================
   PAGE STAFF
========================================================= */

app.get(
    "/staff.html",
    (req, res) => {

        if (
            req.session.staff !== true
        ) {

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
    express.static(
        SITE_FOLDER
    )
);

/* =========================================================
   ERREURS MULTER
========================================================= */

app.use(
    (error, req, res, next) => {

        if (
            error instanceof
            multer.MulterError
        ) {

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res
                    .status(400)
                    .json({
                        success: false,
                        message:
                            "L'image est trop lourde. Maximum : 5 Mo."
                    });
            }

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        "Erreur pendant l'envoi de l'image."
                });
        }

        if (
            error &&
            error.message &&
            error.message.includes(
                "Type d'image non autorisé"
            )
        ) {

            return res
                .status(400)
                .json({
                    success: false,
                    message:
                        error.message
                });
        }

        next(error);
    }
);

/* =========================================================
   ERREUR GENERALE
========================================================= */

app.use(
    (error, req, res, next) => {

        console.error(
            "ERREUR SERVEUR :",
            error
        );

        if (
            res.headersSent
        ) {

            return next(error);
        }

        res
            .status(500)
            .json({
                success: false,
                message:
                    "Une erreur serveur est survenue."
            });
    }
);

/* =========================================================
   DEMARRAGE
========================================================= */

app.listen(
    PORT,
    HOST,
    () => {

        console.log("");
        console.log(
            "================================="
        );
        console.log(
            "      BUSINESS. - SERVEUR"
        );
        console.log(
            "================================="
        );
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