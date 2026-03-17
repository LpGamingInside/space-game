const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const players = {};

app.get("/", (req, res) => {
    res.send("Server läuft!");
});

io.on("connection", (socket) => {
    console.log("Spieler verbunden:", socket.id);

    players[socket.id] = { x: 400, y: 300 };

    socket.emit("currentPlayers", players);

    socket.on("move", (data) => {
        if (!players[socket.id]) return;

        players[socket.id] = {
            x: data.x,
            y: data.y
        };

        io.emit("playerMoved", {
            id: socket.id,
            x: data.x,
            y: data.y
        });
    });

    socket.on("disconnect", () => {
        delete players[socket.id];
        io.emit("playerDisconnected", socket.id);
    });
});

server.listen(PORT, () => {
    console.log("Server läuft auf Port " + PORT);
});