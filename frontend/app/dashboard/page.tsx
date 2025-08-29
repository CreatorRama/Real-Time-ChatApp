// app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface User {
  _id: string;
  username: string;
  isActive: boolean;
  lastActiveText: string;
  messages: Array<any>;
}

export default function Dashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const userData = sessionStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setCurrentUser(parsedUser);
    }
  }, []);

  useEffect(() => {
    if (currentUser && currentUser._id) {
      fetchActiveUsers();
    }
  }, [currentUser]); 

  const fetchActiveUsers = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `http://localhost:5000/api/users/${currentUser?._id}`
      );

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        throw new Error("Failed to fetch active users");
      }
    } catch (error) {
      console.error("Error fetching active users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserClick = (user: User) => {
    // Store selected user data in session storage for the chat page
    sessionStorage.setItem("selectedUser", JSON.stringify(user));
    router.push("/chat");
  };

  const handleLogout = async () => {
    await fetch(`http://localhost:5000/api/users/logout/${currentUser?._id}`, {
      method: "PUT",
    });
    localStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("selecteduser");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">ChatApp</h1>
          <div className="flex items-center space-x-4">
            {currentUser && (
              <span className="text-gray-700">
                Welcome, {currentUser.username}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome to your Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            You have successfully logged in! Connect with other active users.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">
              Active Users ({users.length})
            </h2>
            <p className="text-sm text-gray-500">
              Click on a user to start chatting
            </p>
          </div>
          <ul className="divide-y divide-gray-200">
            {users.map((user) => (
              <li
                key={user._id}
                className="px-6 py-4 hover:bg-indigo-50 transition-colors duration-150 cursor-pointer"
                onClick={() => handleUserClick(user)}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0 relative">
                    <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-800 font-semibold">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div
                      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
                        user.isActive ? "bg-green-500" : "bg-gray-400"
                      }`}
                    ></div>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium text-gray-900">
                        {user.username}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {user.lastActiveText}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {user.isActive ? "Online" : "Offline"}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {users.length === 0 && (
            <div className="px-6 py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No active users
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by inviting people to join the app.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
