const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

const rooms = {};

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('join_room', ({ roomId, playerName, isHost }) => {
        socket.join(roomId);
        if (!rooms[roomId]) {
            rooms[roomId] = {
                players: [],
                currentPlayerIndex: 0,
                gameActive: false,
                cells: null
            };
        }
        const room = rooms[roomId];
        const newPlayer = {
            id: socket.id,
            name: playerName,
            money: 1000,
            position: 0,
            skipNext: false,
            isBot: false,
            color: '#' + Math.floor(Math.random()*16777215).toString(16)
        };
        room.players.push(newPlayer);
        socket.to(roomId).emit('player_joined', { player: newPlayer });
        io.to(roomId).emit('room_data', {
            players: room.players,
            currentPlayerIndex: room.currentPlayerIndex,
            gameActive: room.gameActive,
            cells: room.cells
        });
    });

    socket.on('game_update', ({ roomId, players, currentPlayerIndex, gameActive, cells }) => {
        if (rooms[roomId]) {
            rooms[roomId].players = players;
            rooms[roomId].currentPlayerIndex = currentPlayerIndex;
            rooms[roomId].gameActive = gameActive;
            rooms[roomId].cells = cells;
            socket.to(roomId).emit('game_update', { players, currentPlayerIndex, gameActive, cells });
        }
    });

    socket.on('disconnect', () => {
        for (let roomId in rooms) {
            const idx = rooms[roomId].players.findIndex(p => p.id === socket.id);
            if (idx !== -1) {
                rooms[roomId].players.splice(idx, 1);
                io.to(roomId).emit('player_left', { playerId: socket.id });
                if (rooms[roomId].players.length === 0) delete rooms[roomId];
                break;
            }
        }
    });
});

server.listen(3000, () => {
    console.log('Server running on port 3000');
});