// app/chat/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

interface Message {
  _id?: string;
  sender: string;
  receiver: string;
  content: string;
  timestamp: Date;
  isOwnMessage?: boolean;
}

interface User {
  _id: string;
  username: string;
  isActive: boolean;
  lastActiveText: string;
  messages: Message[];
}

export default function Chat() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Get selected user from session storage
    const userData = sessionStorage.getItem("selectedUser");
    if (userData) {
      setSelectedUser(JSON.parse(userData));
    } else {
      router.push("/dashboard");
    }

    const currentuser = sessionStorage.getItem("user");
    setCurrentUser(JSON.parse(currentuser || "{}"));

    // Initialize socket connection
    const newSocket = io("http://localhost:5000", {
      transports: ["websocket"],
      auth: {
        token: localStorage.getItem("token"),
      },
    });
    setSocket(newSocket);

    // Listen for incoming messages
    newSocket.on("receiveMessage", (data: Message) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    // Clean up on unmount
    return () => {
      newSocket.disconnect();
    };
  }, [router]);

  useEffect(() => {
    if (socket && currentUser && selectedUser) {
      // Join room for these two users
      const roomId = [currentUser._id, selectedUser._id].sort().join("-");
      socket.emit("joinRoom", roomId);

      // Load previous messages
      const fetchMessages = async () => {
        try {
          const response = await fetch(
            `http://localhost:5000/api/messages/${currentUser._id}/${selectedUser._id}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
          if (response.ok) {
            const data = await response.json();
            setMessages(data);
          }
        } catch (error) {
          console.error("Failed to fetch messages:", error);
        }
      };

      fetchMessages();
    }

    return () => {
      if (socket) {
        socket.off("receiveMessage");
      }
    };
  }, [socket, currentUser, selectedUser]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !socket || !currentUser || !selectedUser)
      return;

    const messageData: Message = {
      sender: currentUser._id,
      receiver: selectedUser._id,
      content: newMessage.trim(),
      timestamp: new Date(),
      isOwnMessage: true,
    };

    // Get room ID
    const roomId = [currentUser._id, selectedUser._id].sort().join("-");

    // Emit message to server with correct structure
    socket.emit("sendMessage", {
      roomId,
      message: messageData,
    });

    // Optimistically add to UI
    setMessages((prevMessages) => [...prevMessages, messageData]);
    setNewMessage("");
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!selectedUser || !currentUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-indigo-600 text-white">
          <h1 className="text-xl font-bold">ChatApp</h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-2 text-sm text-indigo-100 hover:text-white"
          >
            ← Back to Dashboard
          </button>
        </div>
        <div className="p-4 border-b border-gray-200 flex items-center">
          <div className="flex-shrink-0 relative">
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-semibold">
              {currentUser.username.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">
              {currentUser.username}
            </p>
            <p className="text-xs text-gray-500">You</p>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center">
          <div className="flex-shrink-0 relative">
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-semibold">
              {selectedUser.username.charAt(0).toUpperCase()}
            </div>
            <div
              className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                selectedUser.isActive ? "bg-green-500" : "bg-gray-400"
              }`}
            ></div>
          </div>
          <div className="ml-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedUser.username}
            </h2>
            <p className="text-sm text-gray-500">
              {selectedUser.isActive ? "Online" : selectedUser.lastActiveText}
            </p>
          </div>
        </div>

        {/* Chat Messages */}
        <div
          className="flex-1 overflow-y-auto p-6 bg-[#e5ddd5] bg-opacity-60"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        >
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.sender === currentUser._id || message.isOwnMessage
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === currentUser._id || message.isOwnMessage
                      ? "bg-indigo-500 text-white"
                      : "bg-white text-gray-800"
                  }`}
                >
                  <p>{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      message.sender === currentUser._id || message.isOwnMessage
                        ? "text-indigo-100"
                        : "text-gray-500"
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="bg-gray-100 px-6 py-4 border-t border-gray-200">
          <form onSubmit={handleSendMessage} className="flex space-x-4">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={newMessage.trim() === ""}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-full"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}