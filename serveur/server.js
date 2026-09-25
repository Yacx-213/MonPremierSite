const express = require("express");
const session = require("express-session");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

const app = express();
const PORT = 3000;

const SITE_FOLDER = path.join(__dirname, "..");
const DATA_FOLDER = path.join(__dirname, "data");

const TICKETS_FILE =
    path.join(DATA_FOLDER, "tickets.json");

const VIES_FILE =
    path.join(DATA_FOLDER, "vies.json");

const STAFF_PASSWORD =
    process.env.STAFF_PASSWORD;

const SESSION_SECRET =
    process.env.SESSION_SECRET;


// =========================
// VÉRIFICATIONS
// =========================

if (!STAFF_PASSWORD) {

    console.error(
        "ERREUR : STAFF_PASSWORD manque dans .env"
    );

    process.exit(1);
}

if (!SESSION_SECRET) {

    console.error(
        "ERREUR : SESSION_SECRET manque dans .env"
    );

    process.exit(1);
}


// =========================
// DOSSIER DATA
// =========================

if (!fs.existsSync(DATA_FOLDER)) {

    fs.mkdirSync(
        DATA_FOLDER,
        {
            recursive: true
        }
    );
}


// =========================
// FICHIERS JSON
// =========================

if (!fs.existsSync(TICKETS_FILE)) {

    fs.writeFileSync(
        TICKETS_FILE,
        "[]",
        "utf8"
    );
}

if (!fs.existsSync(VIES_FILE)) {

    fs.writeFileSync(
        VIES_FILE,
        "[]",
        "utf8"
    );
}


// =========================
// MIDDLEWARES
// =========================

app.use(
    express.json()
);

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

            secure: false,

            maxAge:
                8 * 60 * 60 * 1000
        }

    })
);


// =========================
// LECTURE TICKETS
// =========================

function readTickets() {

    try {

        const data =
            fs.readFileSync(
                TICKETS_FILE,
                "utf8"
            );

        return JSON.parse(data);

    } catch (error) {

        console.error(
            "Erreur tickets.json :",
            error
        );

        return [];
    }
}


// =========================
// SAUVEGARDE TICKETS
// =========================

function saveTickets(tickets) {

    fs.writeFileSync(

        TICKETS_FILE,

        JSON.stringify(
            tickets,
            null,
            2
        ),

        "utf8"
    );
}


// =========================
// LECTURE VIES
// =========================

function readVies() {

    try {

        const data =
            fs.readFileSync(
                VIES_FILE,
                "utf8"
            );

        return JSON.parse(data);

    } catch (error) {

        console.error(
            "Erreur vies.json :",
            error
        );

        return [];
    }
}


// =========================
// SAUVEGARDE VIES
// =========================

function saveVies(vies) {

    fs.writeFileSync(

        VIES_FILE,

        JSON.stringify(
            vies,
            null,
            2
        ),

        "utf8"
    );
}


// =========================
// PROTECTION STAFF
// =========================

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


// =========================
// TEST
// =========================

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


// =========================
// LOGIN
// =========================

app.post(
    "/api/login",
    (req, res) => {

        const password =
            req.body?.password;


        if (
            password !==
            STAFF_PASSWORD
        ) {

            return res.status(401).json({

                success: false,

                message:
                    "Mot de passe incorrect."
            });
        }


        req.session.staff =
            true;


        res.json({

            success: true,

            message:
                "Connexion réussie."
        });

    }
);


// =========================
// LOGOUT
// =========================

app.post(
    "/api/logout",
    (req, res) => {

        req.session.destroy(
            (error) => {

                if (error) {

                    return res
                        .status(500)
                        .json({

                            success: false,

                            message:
                                "Erreur pendant la déconnexion."
                        });
                }


                res.json({

                    success: true
                });

            }
        );
    }
);


// =========================
// SESSION
// =========================

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


// ==================================================
// TICKETS
// ==================================================


// ENVOI TICKET

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

            return res.status(400).json({

                success: false,

                message:
                    "Tous les champs sont obligatoires."
            });
        }


        const tickets =
            readTickets();


        const ticket = {

            id: Date.now(),

            type:
                String(type).trim(),

            nom:
                String(nom).trim(),

            discord:
                String(discord).trim(),

            sujet:
                String(sujet).trim(),

            message:
                String(message).trim(),

            date:
                new Date().toISOString(),

            status:
                "Nouveau"
        };


        tickets.push(ticket);

        saveTickets(tickets);


        res.json({

            success: true,

            message:
                "Formulaire envoyé avec succès."
        });

    }
);


// LISTE TICKETS

app.get(
    "/api/tickets",
    requireStaff,
    (req, res) => {

        const tickets =
            readTickets();


        res.json({

            success: true,

            tickets:
                [...tickets].reverse()
        });

    }
);


// MODIFIER TICKET

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
            readTickets();


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
            status;


        saveTickets(tickets);


        res.json({

            success: true,

            ticket
        });

    }
);


// SUPPRIMER TICKET

app.delete(
    "/api/tickets/:id",
    requireStaff,
    (req, res) => {

        const id =
            Number(req.params.id);


        const tickets =
            readTickets();


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


        saveTickets(
            newTickets
        );


        res.json({

            success: true,

            message:
                "Formulaire supprimé."
        });

    }
);


// ==================================================
// SYSTÈME DE VIE
// ==================================================


// CRÉER UNE FICHE DE VIE

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

            return res.status(400).json({

                success: false,

                message:
                    "Tous les champs sont obligatoires."
            });
        }


        const vies =
            readVies();


        const vie = {

            id: Date.now(),

            prenom:
                String(prenom).trim(),

            genre:
                String(genre).trim(),

            age:
                String(age).trim(),

            discord:
                String(discord).trim(),

            histoire:
                String(histoire).trim(),

            date:
                new Date().toISOString(),

            status:
                "Nouveau"
        };


        vies.push(vie);

        saveVies(vies);


        console.log(
            "NOUVELLE FICHE DE VIE :",
            vie.id
        );


        res.json({

            success: true,

            message:
                "Présentation envoyée avec succès."
        });

    }
);


// LISTE DES VIES

app.get(
    "/api/vies",
    requireStaff,
    (req, res) => {

        const vies =
            readVies();


        res.json({

            success: true,

            vies:
                [...vies].reverse()
        });

    }
);


// MODIFIER LE STATUT D'UNE VIE

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
            readVies();


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
            status;


        saveVies(vies);


        res.json({

            success: true,

            vie
        });

    }
);


// SUPPRIMER UNE VIE

app.delete(
    "/api/vies/:id",
    requireStaff,
    (req, res) => {

        const id =
            Number(req.params.id);


        const vies =
            readVies();


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


        saveVies(
            newVies
        );


        res.json({

            success: true,

            message:
                "Fiche de vie supprimée."
        });

    }
);


// =========================
// PAGE STAFF
// =========================

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


// =========================
// FICHIERS DU SITE
// =========================

app.use(
    express.static(
        SITE_FOLDER
    )
);


// =========================
// SERVEUR
// =========================

app.listen(
    PORT,
    "127.0.0.1",
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
            "Serveur lancé sur : http://127.0.0.1:3000"
        );

        console.log("");

    }
);


// Garde le serveur actif

setInterval(
    () => {},
    1000
);