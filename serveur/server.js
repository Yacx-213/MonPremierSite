const express = require("express");
const session = require("express-session");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const crypto = require("crypto");

dotenv.config({
  path: path.join(__dirname, ".env"),
});

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
const CREATIONS_FILE = path.join(DATA_FOLDER, "creations.json");
const MESSAGES_FILE = path.join(DATA_FOLDER, "messages.json");
const INNOVATION_FILE = path.join(DATA_FOLDER, "innovation.json");
const AMBITION_FILE = path.join(DATA_FOLDER, "ambition.json");

const UPLOAD_FOLDER = path.join(
  SITE_FOLDER,
  "uploads",
  "creativite"
);

const STAFF_PASSWORD = process.env.STAFF_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!STAFF_PASSWORD) {
  console.error(
    "ERREUR : STAFF_PASSWORD est manquant dans .env"
  );
  process.exit(1);
}

if (!SESSION_SECRET) {
  console.error(
    "ERREUR : SESSION_SECRET est manquant dans .env"
  );
  process.exit(1);
}

fs.mkdirSync(DATA_FOLDER, {
  recursive: true
});

fs.mkdirSync(UPLOAD_FOLDER, {
  recursive: true
});

function createFileIfMissing(
  filePath,
  defaultValue = []
) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(
      filePath,
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
createFileIfMissing(PARAMETRES_FILE, {});
createFileIfMissing(CREATIONS_FILE, []);
createFileIfMissing(MESSAGES_FILE, []);
createFileIfMissing(INNOVATION_FILE, []);
createFileIfMissing(AMBITION_FILE, []);

app.set("trust proxy", 1);

app.use(
  express.json({
    limit: "2mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(
  session({
    secret: SESSION_SECRET,

    resave: false,

    saveUninitialized: false,

    cookie: {
      httpOnly: true,

      secure:
        process.env.NODE_ENV === "production",

      sameSite: "lax",

      maxAge:
        1000 * 60 * 60 * 24,
    },
  })
);

function readJSON(
  filePath,
  fallback = []
) {
  try {

    if (!fs.existsSync(filePath)) {
      return fallback;
    }

    const raw =
      fs.readFileSync(
        filePath,
        "utf8"
      );

    if (!raw.trim()) {
      return fallback;
    }

    return JSON.parse(raw);

  } catch (error) {

    console.error(
      `Erreur lecture JSON : ${filePath}`,
      error
    );

    return fallback;
  }
}

function saveJSON(
  filePath,
  data
) {
  fs.writeFileSync(
    filePath,
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

function generateId() {
  return crypto.randomUUID();
}

function nowISO() {
  return new Date().toISOString();
}

function requireStaff(
  req,
  res,
  next
) {

  if (
    req.session &&
    req.session.staff === true
  ) {
    return next();
  }

  return res.status(401).json({
    success: false,
    message:
      "Accès réservé au Staff.",
  });
}

function sendSuccess(
  res,
  data = {}
) {
  return res.json({
    success: true,
    ...data,
  });
}

/* =========================================================
   MULTER
========================================================= */

const storage =
  multer.diskStorage({

    destination:
      (req, file, cb) => {

        cb(
          null,
          UPLOAD_FOLDER
        );

      },

    filename:
      (req, file, cb) => {

        const extension =
          path
            .extname(
              file.originalname
            )
            .toLowerCase();

        const filename =
          `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${extension}`;

        cb(
          null,
          filename
        );

      },

  });

const upload =
  multer({

    storage,

    limits: {
      fileSize:
        5 * 1024 * 1024,
    },

    fileFilter:
      (req, file, cb) => {

        const allowed = [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
        ];

        if (
          !allowed.includes(
            file.mimetype
          )
        ) {
          return cb(
            new Error(
              "FORMAT_IMAGE_INVALIDE"
            )
          );
        }

        cb(null, true);
      },

  });

/* =========================================================
   TEST
========================================================= */

app.get(
  "/api/test",
  (req, res) => {

    res.json({
      success: true,
      message:
        "Serveur opérationnel.",
    });

  }
);

/* =========================================================
   AUTH STAFF
========================================================= */

app.post(
  "/api/login",
  (req, res) => {

    const password =
      clean(req.body.password);

    if (
      !password ||
      password !== STAFF_PASSWORD
    ) {

      return res.status(401).json({
        success: false,
        message:
          "Mot de passe incorrect.",
      });

    }

    req.session.staff = true;

    return sendSuccess(
      res,
      {
        message:
          "Connexion réussie.",
      }
    );
  }
);

app.post(
  "/api/logout",
  (req, res) => {

    req.session.destroy(
      () => {

        res.json({
          success: true,
          message:
            "Déconnexion réussie.",
        });

      }
    );

  }
);

app.get(
  "/api/session",
  (req, res) => {

    res.json({
      success: true,
      staff:
        req.session?.staff === true,
    });

  }
);

/* =========================================================
   TICKETS
========================================================= */

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
      tickets,
    });

  }
);

app.post(
  "/api/tickets",
  (req, res) => {

    const type =
      clean(req.body.type);

    const nom =
      clean(req.body.nom);

    const discord =
      clean(req.body.discord);

    const sujet =
      clean(req.body.sujet);

    const message =
      clean(req.body.message);

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
          "Tous les champs sont obligatoires.",
      });

    }

    const tickets =
      readJSON(
        TICKETS_FILE,
        []
      );

    const ticket = {
      id: generateId(),
      type,
      nom,
      discord,
      sujet,
      message,
      statut: "Nouveau",
      date: nowISO(),
    };

    tickets.push(ticket);

    saveJSON(
      TICKETS_FILE,
      tickets
    );

    sendSuccess(
      res,
      {
        message:
          "Ticket envoyé.",
        ticket,
      }
    );
  }
);

app.patch(
  "/api/tickets/:id",
  requireStaff,
  (req, res) => {

    const tickets =
      readJSON(
        TICKETS_FILE,
        []
      );

    const ticket =
      tickets.find(
        item =>
          item.id === req.params.id
      );

    if (!ticket) {

      return res.status(404).json({
        success: false,
        message:
          "Ticket introuvable.",
      });

    }

    const allowedStatus = [
      "Nouveau",
      "En cours",
      "Résolu",
      "Fermé",
    ];

    if (
      req.body.statut !==
      undefined
    ) {

      const statut =
        clean(
          req.body.statut
        );

      if (
        !allowedStatus.includes(
          statut
        )
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Statut de ticket invalide.",
        });

      }

      ticket.statut =
        statut;
    }

    if (
      req.body.reponse !==
      undefined
    ) {

      ticket.reponse =
        clean(
          req.body.reponse
        );
    }

    ticket.modifieLe =
      nowISO();

    saveJSON(
      TICKETS_FILE,
      tickets
    );

    sendSuccess(
      res,
      {
        message:
          "Ticket modifié.",
        ticket,
      }
    );
  }
);

app.delete(
  "/api/tickets/:id",
  requireStaff,
  (req, res) => {

    const tickets =
      readJSON(
        TICKETS_FILE,
        []
      );

    const index =
      tickets.findIndex(
        item =>
          item.id === req.params.id
      );

    if (index === -1) {

      return res.status(404).json({
        success: false,
        message:
          "Ticket introuvable.",
      });

    }

    tickets.splice(
      index,
      1
    );

    saveJSON(
      TICKETS_FILE,
      tickets
    );

    sendSuccess(
      res,
      {
        message:
          "Ticket supprimé.",
      }
    );
  }
);

/* =========================================================
   FICHES DE VIE
========================================================= */

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
      vies,
    });

  }
);

app.post(
  "/api/vies",
  (req, res) => {

    const prenom =
      clean(
        req.body.prenom
      );

    const genre =
      clean(
        req.body.genre
      );

    const age =
      clean(
        req.body.age
      );

    const discord =
      clean(
        req.body.discord
      );

    const histoire =
      clean(
        req.body.histoire
      );

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
          "Tous les champs sont obligatoires.",
      });

    }

    const vies =
      readJSON(
        VIES_FILE,
        []
      );

    const vie = {
      id: generateId(),
      prenom,
      genre,
      age,
      discord,
      histoire,
      date: nowISO(),
    };

    vies.push(vie);

    saveJSON(
      VIES_FILE,
      vies
    );

    sendSuccess(
      res,
      {
        message:
          "Fiche de vie enregistrée.",
        vie,
      }
    );
  }
);

app.patch(
  "/api/vies/:id",
  requireStaff,
  (req, res) => {

    const vies =
      readJSON(
        VIES_FILE,
        []
      );

    const vie =
      vies.find(
        item =>
          item.id === req.params.id
      );

    if (!vie) {

      return res.status(404).json({
        success: false,
        message:
          "Fiche introuvable.",
      });

    }

    const fields = [
      "prenom",
      "genre",
      "age",
      "discord",
      "histoire",
    ];

    for (
      const field of fields
    ) {

      if (
        req.body[field] !==
        undefined
      ) {

        vie[field] =
          clean(
            req.body[field]
          );

      }

    }

    vie.modifieLe =
      nowISO();

    saveJSON(
      VIES_FILE,
      vies
    );

    sendSuccess(
      res,
      {
        message:
          "Fiche modifiée.",
        vie,
      }
    );
  }
);

app.delete(
  "/api/vies/:id",
  requireStaff,
  (req, res) => {

    const vies =
      readJSON(
        VIES_FILE,
        []
      );

    const index =
      vies.findIndex(
        item =>
          item.id === req.params.id
      );

    if (index === -1) {

      return res.status(404).json({
        success: false,
        message:
          "Fiche introuvable.",
      });

    }

    vies.splice(
      index,
      1
    );

    saveJSON(
      VIES_FILE,
      vies
    );

    sendSuccess(
      res,
      {
        message:
          "Fiche supprimée.",
      }
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
        annonces.reverse(),
    });

  }
);

app.post(
  "/api/annonces",
  requireStaff,
  (req, res) => {

    const titre =
      clean(req.body.titre);

    const contenu =
      clean(req.body.contenu);

    const auteur =
      clean(
        req.body.auteur
      ) || "Staff";

    if (
      !titre ||
      !contenu
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Titre et contenu obligatoires.",
      });

    }

    const annonces =
      readJSON(
        ANNONCES_FILE,
        []
      );

    const annonce = {
      id: generateId(),
      titre,
      contenu,
      auteur,
      date: nowISO(),
    };

    annonces.push(annonce);

    saveJSON(
      ANNONCES_FILE,
      annonces
    );

    sendSuccess(
      res,
      {
        message:
          "Annonce créée.",
        annonce,
      }
    );
  }
);

app.patch(
  "/api/annonces/:id",
  requireStaff,
  (req, res) => {

    const annonces =
      readJSON(
        ANNONCES_FILE,
        []
      );

    const annonce =
      annonces.find(
        item =>
          item.id === req.params.id
      );

    if (!annonce) {

      return res.status(404).json({
        success: false,
        message:
          "Annonce introuvable.",
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
      req.body.auteur !==
      undefined
    ) {

      annonce.auteur =
        clean(
          req.body.auteur
        );

    }

    annonce.modifieLe =
      nowISO();

    saveJSON(
      ANNONCES_FILE,
      annonces
    );

    sendSuccess(
      res,
      {
        message:
          "Annonce modifiée.",
        annonce,
      }
    );
  }
);

app.delete(
  "/api/annonces/:id",
  requireStaff,
  (req, res) => {

    const annonces =
      readJSON(
        ANNONCES_FILE,
        []
      );

    const index =
      annonces.findIndex(
        item =>
          item.id === req.params.id
      );

    if (index === -1) {

      return res.status(404).json({
        success: false,
        message:
          "Annonce introuvable.",
      });

    }

    annonces.splice(
      index,
      1
    );

    saveJSON(
      ANNONCES_FILE,
      annonces
    );

    sendSuccess(
      res,
      {
        message:
          "Annonce supprimée.",
      }
    );
  }
);

/* =========================================================
   EVENEMENTS
========================================================= */

app.get(
  "/api/evenements",
  requireStaff,
  (req, res) => {

    const evenements =
      readJSON(
        EVENEMENTS_FILE,
        []
      );

    res.json({
      success: true,
      evenements,
    });

  }
);

app.post(
  "/api/evenements",
  requireStaff,
  (req, res) => {

    const titre =
      clean(req.body.titre);

    const description =
      clean(
        req.body.description
      );

    const date =
      clean(
        req.body.date
      );

    const heure =
      clean(
        req.body.heure
      );

    const lieu =
      clean(
        req.body.lieu
      );

    if (
      !titre ||
      !description ||
      !date
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Les champs principaux sont obligatoires.",
      });

    }

    const evenements =
      readJSON(
        EVENEMENTS_FILE,
        []
      );

    const evenement = {
      id: generateId(),
      titre,
      description,
      date,
      heure,
      lieu,
      dateCreation:
        nowISO(),
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
      {
        message:
          "Événement créé.",
        evenement,
      }
    );
  }
);

app.patch(
  "/api/evenements/:id",
  requireStaff,
  (req, res) => {

    const evenements =
      readJSON(
        EVENEMENTS_FILE,
        []
      );

    const evenement =
      evenements.find(
        item =>
          item.id === req.params.id
      );

    if (!evenement) {

      return res.status(404).json({
        success: false,
        message:
          "Événement introuvable.",
      });

    }

    const fields = [
      "titre",
      "description",
      "date",
      "heure",
      "lieu",
    ];

    for (
      const field of fields
    ) {

      if (
        req.body[field] !==
        undefined
      ) {

        evenement[field] =
          clean(
            req.body[field]
          );

      }

    }

    evenement.modifieLe =
      nowISO();

    saveJSON(
      EVENEMENTS_FILE,
      evenements
    );

    sendSuccess(
      res,
      {
        message:
          "Événement modifié.",
        evenement,
      }
    );
  }
);

app.delete(
  "/api/evenements/:id",
  requireStaff,
  (req, res) => {

    const evenements =
      readJSON(
        EVENEMENTS_FILE,
        []
      );

    const index =
      evenements.findIndex(
        item =>
          item.id === req.params.id
      );

    if (index === -1) {

      return res.status(404).json({
        success: false,
        message:
          "Événement introuvable.",
      });

    }

    evenements.splice(
      index,
      1
    );

    saveJSON(
      EVENEMENTS_FILE,
      evenements
    );

    sendSuccess(
      res,
      {
        message:
          "Événement supprimé.",
      }
    );
  }
);

/* =========================================================
   MEMBRES
========================================================= */

app.get(
  "/api/membres",
  requireStaff,
  (req, res) => {

    const membres =
      readJSON(
        MEMBRES_FILE,
        []
      );

    res.json({
      success: true,
      membres,
    });

  }
);

app.post(
  "/api/membres",
  requireStaff,
  (req, res) => {

    const pseudo =
      clean(req.body.pseudo);

    const discord =
      clean(req.body.discord);

    const role =
      clean(req.body.role);

    const statut =
      clean(
        req.body.statut
      ) || "Actif";

    if (
      !pseudo ||
      !discord
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Pseudo et Discord sont obligatoires.",
      });

    }

    const membres =
      readJSON(
        MEMBRES_FILE,
        []
      );

    const membre = {
      id: generateId(),
      pseudo,
      discord,
      role,
      statut,
      dateAjout:
        nowISO(),
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
      {
        message:
          "Membre ajouté.",
        membre,
      }
    );
  }
);

app.patch(
  "/api/membres/:id",
  requireStaff,
  (req, res) => {

    const membres =
      readJSON(
        MEMBRES_FILE,
        []
      );

    const membre =
      membres.find(
        item =>
          item.id === req.params.id
      );

    if (!membre) {

      return res.status(404).json({
        success: false,
        message:
          "Membre introuvable.",
      });

    }

    const fields = [
      "pseudo",
      "discord",
      "role",
      "statut",
    ];

    for (
      const field of fields
    ) {

      if (
        req.body[field] !==
        undefined
      ) {

        membre[field] =
          clean(
            req.body[field]
          );

      }

    }

    membre.modifieLe =
      nowISO();

    saveJSON(
      MEMBRES_FILE,
      membres
    );

    sendSuccess(
      res,
      {
        message:
          "Membre modifié.",
        membre,
      }
    );
  }
);

app.delete(
  "/api/membres/:id",
  requireStaff,
  (req, res) => {

    const membres =
      readJSON(
        MEMBRES_FILE,
        []
      );

    const index =
      membres.findIndex(
        item =>
          item.id === req.params.id
      );

    if (index === -1) {

      return res.status(404).json({
        success: false,
        message:
          "Membre introuvable.",
      });

    }

    membres.splice(
      index,
      1
    );

    saveJSON(
      MEMBRES_FILE,
      membres
    );

    sendSuccess(
      res,
      {
        message:
          "Membre supprimé.",
      }
    );
  }
);

/* =========================================================
   PARAMETRES
========================================================= */

app.get(
  "/api/parametres",
  requireStaff,
  (req, res) => {

    const parametres =
      readJSON(
        PARAMETRES_FILE,
        {}
      );

    res.json({
      success: true,
      parametres,
    });

  }
);

app.patch(
  "/api/parametres",
  requireStaff,
  (req, res) => {

    const current =
      readJSON(
        PARAMETRES_FILE,
        {}
      );

    const updates =
      req.body || {};

    const parametres = {
      ...current,
      ...updates,
      modifieLe:
        nowISO(),
    };

    saveJSON(
      PARAMETRES_FILE,
      parametres
    );

    sendSuccess(
      res,
      {
        message:
          "Paramètres enregistrés.",
        parametres,
      }
    );
  }
);

/* =========================================================
   CRÉATIVITÉ - CRÉATIONS
========================================================= */

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
        creations.reverse(),
    });

  }
);

app.post(
  "/api/creativite/creations",
  upload.single("image"),
  (req, res) => {

    try {

      if (!req.file) {

        return res.status(400).json({
          success: false,
          message:
            "Aucune image reçue.",
        });

      }

      const pseudo =
        clean(
          req.body.pseudo
        );

      const titre =
        clean(
          req.body.titre
        );

      const description =
        clean(
          req.body.description
        );

      if (
        !pseudo ||
        !titre
      ) {

        fs.unlinkSync(
          req.file.path
        );

        return res.status(400).json({
          success: false,
          message:
            "Pseudo et titre obligatoires.",
        });

      }

      const creations =
        readJSON(
          CREATIONS_FILE,
          []
        );

      const creation = {
        id: generateId(),
        pseudo,
        titre,
        description,
        image:
          `/uploads/creativite/${req.file.filename}`,
        date:
          nowISO(),
      };

      creations.push(
        creation
      );

      saveJSON(
        CREATIONS_FILE,
        creations
      );

      sendSuccess(
        res,
        {
          message:
            "Création publiée.",
          creation,
        }
      );

    } catch (error) {

      console.error(
        error
      );

      if (
        req.file?.path &&
        fs.existsSync(
          req.file.path
        )
      ) {

        fs.unlinkSync(
          req.file.path
        );

      }

      res.status(500).json({
        success: false,
        message:
          "Impossible de publier la création.",
      });
    }
  }
);

app.delete(
  "/api/creativite/creations/:id",
  requireStaff,
  (req, res) => {

    const creations =
      readJSON(
        CREATIONS_FILE,
        []
      );

    const index =
      creations.findIndex(
        item =>
          item.id === req.params.id
      );

    if (index === -1) {

      return res.status(404).json({
        success: false,
        message:
          "Création introuvable.",
      });

    }

    const creation =
      creations[index];

    if (
      creation.image
    ) {

      const relativePath =
        creation.image.replace(
          /^\/+/,
          ""
        );

      const imagePath =
        path.join(
          SITE_FOLDER,
          relativePath
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

        } catch (
          error
        ) {

          console.error(
            "Impossible de supprimer l'image :",
            error
          );

        }
      }
    }

    creations.splice(
      index,
      1
    );

    saveJSON(
      CREATIONS_FILE,
      creations
    );

    sendSuccess(
      res,
      {
        message:
          "Création supprimée.",
      }
    );
  }
);

/* =========================================================
   CRÉATIVITÉ - MESSAGES
========================================================= */

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
        messages.slice(-100),
    });

  }
);

app.post(
  "/api/creativite/messages",
  (req, res) => {

    const pseudo =
      clean(
        req.body.pseudo
      );

    const message =
      clean(
        req.body.message
      );

    if (
      !pseudo ||
      !message
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Pseudo et message obligatoires.",
      });

    }

    if (
      message.length > 500
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Message trop long.",
      });

    }

    const messages =
      readJSON(
        MESSAGES_FILE,
        []
      );

    const newMessage = {
      id: generateId(),
      pseudo,
      message,
      date:
        nowISO(),
    };

    messages.push(
      newMessage
    );

    if (
      messages.length > 500
    ) {

      messages.splice(
        0,
        messages.length - 500
      );

    }

    saveJSON(
      MESSAGES_FILE,
      messages
    );

    sendSuccess(
      res,
      {
        message:
          "Message envoyé.",
        data:
          newMessage,
      }
    );
  }
);

app.delete(
  "/api/creativite/messages/:id",
  requireStaff,
  (req, res) => {

    const messages =
      readJSON(
        MESSAGES_FILE,
        []
      );

    const index =
      messages.findIndex(
        item =>
          item.id === req.params.id
      );

    if (index === -1) {

      return res.status(404).json({
        success: false,
        message:
          "Message introuvable.",
      });

    }

    messages.splice(
      index,
      1
    );

    saveJSON(
      MESSAGES_FILE,
      messages
    );

    sendSuccess(
      res,
      {
        message:
          "Message supprimé.",
      }
    );
  }
);

/* =========================================================
   INNOVATION
========================================================= */

app.get(
  "/api/innovation",
  (req, res) => {

    const ideas =
      readJSON(
        INNOVATION_FILE,
        []
      );

    res.json({
      success: true,
      ideas:
        ideas.reverse(),
    });

  }
);

app.post(
  "/api/innovation",
  (req, res) => {

    const titre =
      clean(
        req.body.titre
      );

    const description =
      clean(
        req.body.description
      );

    const auteur =
      clean(
        req.body.auteur
      ) || "Anonyme";

    if (
      !titre ||
      !description
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Titre et description obligatoires.",
      });

    }

    const ideas =
      readJSON(
        INNOVATION_FILE,
        []
      );

    const idea = {
      id: generateId(),
      titre,
      description,
      auteur,
      votes: 0,
      status: "Nouvelle",
      date:
        nowISO(),
    };

    ideas.push(
      idea
    );

    saveJSON(
      INNOVATION_FILE,
      ideas
    );

    sendSuccess(
      res,
      {
        message:
          "Idée proposée.",
        idea,
      }
    );
  }
);

app.post(
  "/api/innovation/:id/vote",
  (req, res) => {

    const ideas =
      readJSON(
        INNOVATION_FILE,
        []
      );

    const idea =
      ideas.find(
        item =>
          item.id === req.params.id
      );

    if (!idea) {

      return res.status(404).json({
        success: false,
        message:
          "Idée introuvable.",
      });

    }

    idea.votes =
      Number(
        idea.votes || 0
      ) + 1;

    saveJSON(
      INNOVATION_FILE,
      ideas
    );

    sendSuccess(
      res,
      {
        message:
          "Vote enregistré.",
        votes:
          idea.votes,
      }
    );
  }
);

app.patch(
  "/api/innovation/:id",
  requireStaff,
  (req, res) => {

    const ideas =
      readJSON(
        INNOVATION_FILE,
        []
      );

    const idea =
      ideas.find(
        item =>
          item.id === req.params.id
      );

    if (!idea) {

      return res.status(404).json({
        success: false,
        message:
          "Idée introuvable.",
      });

    }

    const allowedStatus = [
      "Nouvelle",
      "En étude",
      "Acceptée",
      "Refusée",
    ];

    if (
      req.body.titre !==
      undefined
    ) {

      idea.titre =
        clean(
          req.body.titre
        );

    }

    if (
      req.body.description !==
      undefined
    ) {

      idea.description =
        clean(
          req.body.description
        );

    }

    if (
      req.body.auteur !==
      undefined
    ) {

      idea.auteur =
        clean(
          req.body.auteur
        );

    }

    if (
      req.body.status !==
      undefined
    ) {

      const status =
        clean(
          req.body.status
        );

      if (
        !allowedStatus.includes(
          status
        )
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Statut d'idée invalide.",
        });

      }

      idea.status =
        status;
    }

    idea.modifieLe =
      nowISO();

    saveJSON(
      INNOVATION_FILE,
      ideas
    );

    sendSuccess(
      res,
      {
        message:
          "Idée modifiée.",
        idea,
      }
    );
  }
);

app.delete(
  "/api/innovation/:id",
  requireStaff,
  (req, res) => {

    const ideas =
      readJSON(
        INNOVATION_FILE,
        []
      );

    const index =
      ideas.findIndex(
        item =>
          item.id === req.params.id
      );

    if (index === -1) {

      return res.status(404).json({
        success: false,
        message:
          "Idée introuvable.",
      });

    }

    ideas.splice(
      index,
      1
    );

    saveJSON(
      INNOVATION_FILE,
      ideas
    );

    sendSuccess(
      res,
      {
        message:
          "Idée supprimée.",
      }
    );
  }
);

/* =========================================================
   AMBITION
========================================================= */

const AMBITION_STATUSES = [
  "En préparation",
  "En cours",
  "Terminé",
  "En pause",
];

function normalizeProgress(
  value
) {

  const progress =
    Number(value);

  if (
    !Number.isFinite(
      progress
    )
  ) {
    return null;
  }

  if (
    progress < 0 ||
    progress > 100
  ) {
    return null;
  }

  return Math.round(
    progress
  );
}

/*
  PUBLIC :
  Voir les projets.
*/

app.get(
  "/api/ambition",
  (req, res) => {

    const projects =
      readJSON(
        AMBITION_FILE,
        []
      );

    res.json({
      success: true,
      projects:
        projects.reverse(),
    });

  }
);

/*
  PUBLIC :
  Proposer un projet.

  Un visiteur peut seulement renseigner :
  - titre
  - responsable
  - description
  - date de fin

  Le serveur impose :
  - statut = En préparation
  - progression = 0
*/

app.post(
  "/api/ambition",
  (req, res) => {

    const titre =
      clean(
        req.body.titre
      );

    const responsable =
      clean(
        req.body.responsable
      );

    const description =
      clean(
        req.body.description
      );

    const dateFin =
      clean(
        req.body.dateFin
      );

    if (
      !titre ||
      !responsable ||
      !description
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Titre, responsable et description sont obligatoires.",
      });

    }

    if (
      titre.length > 100
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Le titre est trop long.",
      });

    }

    if (
      responsable.length > 60
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Le nom du responsable est trop long.",
      });

    }

    if (
      description.length > 2000
    ) {

      return res.status(400).json({
        success: false,
        message:
          "La description est trop longue.",
      });

    }

    const projects =
      readJSON(
        AMBITION_FILE,
        []
      );

    const project = {
      id: generateId(),

      titre,

      responsable,

      description,

      progress: 0,

      dateFin,

      status:
        "En préparation",

      date:
        nowISO(),
    };

    projects.push(
      project
    );

    saveJSON(
      AMBITION_FILE,
      projects
    );

    sendSuccess(
      res,
      {
        message:
          "Projet Ambition ajouté.",
        project,
      }
    );
  }
);

/*
  STAFF :
  Modifier un projet.
*/

app.patch(
  "/api/ambition/:id",
  requireStaff,
  (req, res) => {

    const projects =
      readJSON(
        AMBITION_FILE,
        []
      );

    const project =
      projects.find(
        item =>
          item.id === req.params.id
      );

    if (!project) {

      return res.status(404).json({
        success: false,
        message:
          "Projet Ambition introuvable.",
      });

    }

    if (
      req.body.titre !==
      undefined
    ) {

      const titre =
        clean(
          req.body.titre
        );

      if (
        !titre
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Le titre est obligatoire.",
        });

      }

      project.titre =
        titre;
    }

    if (
      req.body.responsable !==
      undefined
    ) {

      const responsable =
        clean(
          req.body.responsable
        );

      if (
        !responsable
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Le responsable est obligatoire.",
        });

      }

      project.responsable =
        responsable;
    }

    if (
      req.body.description !==
      undefined
    ) {

      const description =
        clean(
          req.body.description
        );

      if (
        !description
      ) {

        return res.status(400).json({
          success: false,
          message:
            "La description est obligatoire.",
        });

      }

      project.description =
        description;
    }

    if (
      req.body.dateFin !==
      undefined
    ) {

      project.dateFin =
        clean(
          req.body.dateFin
        );

    }

    if (
      req.body.progress !==
      undefined
    ) {

      const progress =
        normalizeProgress(
          req.body.progress
        );

      if (
        progress === null
      ) {

        return res.status(400).json({
          success: false,
          message:
            "La progression doit être comprise entre 0 et 100.",
        });

      }

      project.progress =
        progress;
    }

    if (
      req.body.status !==
      undefined
    ) {

      const status =
        clean(
          req.body.status
        );

      if (
        !AMBITION_STATUSES.includes(
          status
        )
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Statut Ambition invalide.",
        });

      }

      project.status =
        status;
    }

    project.modifieLe =
      nowISO();

    saveJSON(
      AMBITION_FILE,
      projects
    );

    sendSuccess(
      res,
      {
        message:
          "Projet Ambition modifié.",
        project,
      }
    );
  }
);

/*
  STAFF :
  Supprimer un projet.
*/

app.delete(
  "/api/ambition/:id",
  requireStaff,
  (req, res) => {

    const projects =
      readJSON(
        AMBITION_FILE,
        []
      );

    const index =
      projects.findIndex(
        item =>
          item.id === req.params.id
      );

    if (
      index === -1
    ) {

      return res.status(404).json({
        success: false,
        message:
          "Projet Ambition introuvable.",
      });

    }

    projects.splice(
      index,
      1
    );

    saveJSON(
      AMBITION_FILE,
      projects
    );

    sendSuccess(
      res,
      {
        message:
          "Projet Ambition supprimé.",
      }
    );
  }
);

/* =========================================================
   STAFF.HTML PROTÉGÉ
========================================================= */

app.get(
  "/staff.html",
  (req, res, next) => {

    if (
      req.session?.staff !== true
    ) {

      return res.redirect(
        "/staff-login.html"
      );

    }

    next();
  }
);

/* =========================================================
   FICHIERS STATIQUES
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
  (
    error,
    req,
    res,
    next
  ) => {

    if (
      error instanceof
      multer.MulterError
    ) {

      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Image trop lourde. Maximum : 5 Mo.",
        });

      }

      return res.status(400).json({
        success: false,
        message:
          "Erreur lors de l'envoi de l'image.",
      });

    }

    if (
      error?.message ===
      "FORMAT_IMAGE_INVALIDE"
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Format accepté : JPG, PNG, WEBP ou GIF.",
      });

    }

    next(error);
  }
);

/* =========================================================
   ERREUR GÉNÉRALE
========================================================= */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {

    console.error(
      "Erreur serveur :",
      error
    );

    if (
      res.headersSent
    ) {
      return next(error);
    }

    res.status(500).json({
      success: false,
      message:
        "Une erreur serveur est survenue.",
    });

  }
);

/* =========================================================
   DÉMARRAGE
========================================================= */

app.listen(
  PORT,
  HOST,
  () => {

    console.log(
      `Serveur lancé sur http://${HOST}:${PORT}`
    );

  }
);