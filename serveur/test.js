const express = require("express");

const app = express();

app.get("/", (req, res) => {
    res.send("EXPRESS OK");
});

app.listen(3001, "127.0.0.1", () => {
    console.log("EXPRESS ACTIF SUR 3001");
});

setInterval(() => {}, 1000);