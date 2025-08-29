import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import userRoutes from "./routes/user.js";
import messageRoutes from "./routes/Message.js";
import { SocketHandler } from "./socketService/socketService.js";

const app = express();
const server = createServer(app); // Create HTTP server
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

app.use(cors());
app.use(express.json());

mongoose.connect(MONGO_URI)
.then(() => {
    console.log("Connected to MongoDB");
}).catch((err) => {
    console.error("MongoDB connection error:", err);
});


const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

SocketHandler(io);

app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);


server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});