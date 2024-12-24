import { Server } from "socket.io";
import http from "http";
import express from "express";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173"], // Allow frontend connection
    },
});

// Map to track online users: {userId: socketId}
const userSocketMap = {};

// Function to get a user's socket ID
export function getReceiverSocketId(userId) {
    if (!userId) {
        console.error("getReceiverSocketId: userId is undefined");
        return null;
    }

    const socketId = userSocketMap[userId];
    if (!socketId) {
        console.warn(`Socket ID for userId ${userId} not found`);
    }

    return socketId || null;
}

// Socket.IO connection logic
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Retrieve userId from the connection query
    const userId = socket.handshake.query.userId;
    if (userId) {
        userSocketMap[userId] = socket.id;
    }

    // Broadcast online users to all clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // Handle user disconnect
    socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.id);
        if (userId) {
            delete userSocketMap[userId];
        }
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});

export { io, app, server };
