"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
// In‑memory storage of rooms keyed by room ID.  This is wiped
// whenever the server restarts.  In a real game you might
// persist this data or replicate it across instances.
const rooms = {};
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
// Create HTTP and Socket.IO servers.  Socket.IO automatically
// attaches to the HTTP server so that WebSocket traffic goes
// through the same port.
const httpServer = http_1.default.createServer(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        // Optionally restrict origins via CLIENT_ORIGIN
        origin: process.env.CLIENT_ORIGIN || '*',
    },
});
// Serve static files from client build when in production mode.
if (process.env.NODE_ENV === 'production') {
    // The client build should be copied into server/public before
    // starting the server in production.  See README for details.
    const publicDir = path_1.default.join(__dirname, 'public');
    app.use(express_1.default.static(publicDir));
    // Fallback to index.html for single‑page routing
    app.get('*', (_, res) => {
        res.sendFile(path_1.default.join(publicDir, 'index.html'));
    });
}
io.on('connection', (socket) => {
    let currentPlayer = null;
    // Helper to produce a lightweight room summary.  This is sent
    // to clients so they can populate their server browser.
    function getRoomList() {
        return Object.values(rooms).map((room) => ({
            id: room.id,
            name: room.name,
            playerCount: Object.keys(room.players).length,
            locked: Boolean(room.password),
        }));
    }
    // Send the current room list back to the requesting client
    socket.on('listRooms', () => {
        socket.emit('roomList', getRoomList());
    });
    // Handle room creation.  A player who creates a room is
    // automatically added to it as the first player.
    socket.on('createRoom', (data) => {
        const id = generateId();
        const room = { id, name: data.name, password: data.password || undefined, players: {} };
        rooms[id] = room;
        const player = {
            id: socket.id,
            name: data.playerName,
            x: Math.random() * 800,
            y: Math.random() * 600,
            roomId: id,
        };
        room.players[socket.id] = player;
        currentPlayer = player;
        socket.join(id);
        // Notify the creator they have joined and send the current state
        socket.emit('joinedRoom', { roomId: id, playerId: socket.id, players: room.players });
        // Update the global room list for all clients
        io.emit('roomList', getRoomList());
    });
    // Join an existing room, checking password and capacity
    socket.on('joinRoom', (data) => {
        const room = rooms[data.roomId];
        if (!room) {
            socket.emit('joinError', { message: 'Room not found' });
            return;
        }
        if (room.password && room.password !== data.password) {
            socket.emit('joinError', { message: 'Incorrect password' });
            return;
        }
        if (Object.keys(room.players).length >= 16) {
            socket.emit('joinError', { message: 'Room full' });
            return;
        }
        const player = {
            id: socket.id,
            name: data.playerName,
            x: Math.random() * 800,
            y: Math.random() * 600,
            roomId: room.id,
        };
        room.players[socket.id] = player;
        currentPlayer = player;
        socket.join(room.id);
        // Send current players to the joining client
        socket.emit('joinedRoom', { roomId: room.id, playerId: socket.id, players: room.players });
        // Notify other players in the room of the new player
        socket.to(room.id).emit('playerJoined', { player });
        io.emit('roomList', getRoomList());
    });
    // Receive input from a client and update the authoritative position
    socket.on('playerInput', (data) => {
        if (!currentPlayer)
            return;
        const speed = 2.5;
        currentPlayer.x += data.dx * speed;
        currentPlayer.y += data.dy * speed;
        const room = rooms[currentPlayer.roomId];
        if (room) {
            // Broadcast the entire player state to everyone in the room
            io.to(room.id).emit('state', { players: room.players });
        }
    });
    // Clean up when a client disconnects
    socket.on('disconnect', () => {
        if (!currentPlayer)
            return;
        const room = rooms[currentPlayer.roomId];
        if (room) {
            delete room.players[socket.id];
            socket.to(room.id).emit('playerLeft', { playerId: socket.id });
            if (Object.keys(room.players).length === 0) {
                delete rooms[room.id];
            }
            io.emit('roomList', getRoomList());
        }
    });
});
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Breachline server listening on port ${PORT}`);
});
