import jwt from "jsonwebtoken";
import Message from "../models/Message.js";
import User from "../models/User.js";

export const SocketHandler = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.user = user;
      socket.userId = user._id.toString();
      console.log(`User ${socket.user.username} authenticated`);
      next();
    } catch (err) {
      console.error("Authentication error:", err.message);
      next(new Error("Authentication error"));
    }
  });


  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("joinRoom", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on("leaveRoom", (roomId) => {
      socket.leave(roomId);
      console.log(`User ${socket.id} left room ${roomId}`);
    });

    socket.on("sendMessage", async (data) => {
      try {
        const { roomId, message } = data;

        // Create a new message document
        const newMessage = new Message({
          content: message.content,
          sender: message.sender,
          receiver: message.receiver,
          timestamp: message.timestamp,
          messageType: message.messageType || "text",
          // Add attachment data if present
          ...(message.attachment && { attachment: message.attachment }),
        });

        // Save the message to the database
        const savedMessage = await newMessage.save();

        // Populate the sender and receiver information
        const populatedMessage = await Message.findById(savedMessage._id)
          .populate("sender", "username avatar")
          .populate("receiver", "username avatar");

        // Broadcast to everyone in the room including sender
        io.to(roomId).emit("receiveMessage", populatedMessage);

        console.log(
          `Message saved and sent to room ${roomId}:`,
          populatedMessage
        );
      } catch (error) {
        console.error("Error saving message:", error);
        // Emit an error event back to the sender
        socket.emit("messageError", {
          error: "Failed to send message",
          details: error.message,
        });
      }
    });

    // Handle message read status
    socket.on("markAsRead", async (data) => {
      try {
        const { messageIds } = data;

        await Message.markAsRead(messageIds);

        // Notify the sender that their messages were read
        const messages = await Message.find({ _id: { $in: messageIds } });
        const senderIds = [
          ...new Set(messages.map((msg) => msg.sender.toString())),
        ];

        senderIds.forEach((senderId) => {
          io.to(senderId).emit("messagesRead", { messageIds });
        });
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    });

    // Handle typing indicators
    socket.on("typing", (data) => {
      const { roomId, userId, isTyping } = data;
      socket.to(roomId).emit("userTyping", { userId, isTyping });
    });

    socket.on("disconnect", () => {
      console.log("A user disconnected:", socket.id);
    });
  });
};
