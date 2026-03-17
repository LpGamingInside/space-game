const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const players = {};

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => {
    res.send("Server läuft!");
});

io.on("connection", (socket) => {
    console.log("Spieler verbunden:", socket.id);

    players[socket.id] = {
        x: 400,
        y: 300,
        color: "#4da6ff"
    };

    socket.emit("currentPlayers", players);
    socket.broadcast.emit("newPlayer", {
        id: socket.id,
        ...players[socket.id]
    });

    socket.on("move", (data) => {
        if (!players[socket.id]) return;

        players[socket.id].x = data.x;
        players[socket.id].y = data.y;

        io.emit("playerMoved", {
            id: socket.id,
            x: data.x,
            y: data.y
        });
    });

    socket.on("disconnect", () => {
        console.log("Spieler getrennt:", socket.id);
        delete players[socket.id];
        io.emit("playerDisconnected", socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});