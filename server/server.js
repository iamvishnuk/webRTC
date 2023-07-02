const express = require('express');
const app = express();
const { createServer } = require("http")
const httpServer = createServer(app);
const { Server } = require("socket.io")

const PORT = 8000;

app.use(express.static('public'));

const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:3000"],
        credentials: true
    }
})

io.on("connection", (socket) => {
    console.log(`User Connected :$socket.id}`);

    // Triggered when a peer hits the join room button.
    socket.on("join", (roomName) => {
        const {rooms} = io.sockets.adapter
        const room = rooms.get(roomName)
        // room = undefined when so such room exists
        if(room === undefined) {
            socket.join(roomName)
            socket.emit("created")
        } else if(room.size === 1) {
            // room.size === 1 when one person is inside teh room
            socket.join(roomName);
            socket.emit("joined")
        } else {
            // wheere there are already two people insider the room
            socket.emit("full")
        }
        console.log(rooms)
    });

    // Triggered when the person who joined the room is ready to communicate.
    socket.on("ready", (roomName) => {
        socket.broadcast.to(roomName).emit("ready") // Infrom the other peer in the room
    });

    // Triggered when server gets an icecandidate from a peer in the room.
    socket.on("ice-candidate", (candidate, roomName) => {
        console.log(candidate)
        socket.broadcast.to(roomName).emit("ice-candidate",candidate) // send the candidate to the other peer in the room
    });

    // Triggered when server gets an offer from a peer in the room.
    socket.on("offer", (offer, roomName) => {
        socket.broadcast.to(roomName).emit("offer",offer) // sends Offer to the other peer in the room
    });

    // Triggered when server gets an answer from a peer in the room
    socket.on("answer", (answer, roomName) => {
        socket.broadcast.to(roomName).emit("answer",answer) // Send the answer to the other peer in the room.
    });

    // when the peer leave the room
    socket.on("leave", (roomName) => {
        socket.leave(roomName);
        socket.broadcast.to(roomName).emit("leave")
    });

});



httpServer.listen(PORT, () => {
    console.log('Server listening on port:', PORT);
});

