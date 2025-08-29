// Auth routes (routes/auth.js)
import User from "../models/User.js";
import express from "express";
import jwt from "jsonwebtoken";
import { calculateTimeDifference } from "../utils/TimeDiff.js";
const router = express.Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }

  try {
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid email" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password." });
    }

    user.lastActive = new Date();
    user.isActive = true;
    await user.save();

    // Generate JWT token
    const token = user.generateAuthToken();

    const userData = user.toObject();
    delete userData.password;

    console.log("ram");

    res.status(200).json({
      message: "Login successful",
      user: userData,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login." });
  }
});

router.get("/me", async (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID from token
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Add last active text
    const userData = user.toObject();
    userData.lastActiveText = calculateTimeDifference(user.lastActive);

    res.status(200).json(userData);
  } catch (error) {
    console.error("Error fetching user profile:", error);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token." });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired." });
    }

    res.status(500).json({ message: "Server error fetching user profile." });
  }
});

router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ message: "Username, email, and password are required." });
  }

  try {
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use." });
    }

    const newUser = new User({ username, email, password });
    await newUser.save();

    const userData = newUser.toObject();
    delete userData.password;

    res.status(201).json({
      message: "User registered successfully",
      user: userData,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error during registration." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const users = await User.find()
      .where("_id").ne(req.params.id)
      .select("-password");
    
    return res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching active users:", error);
    res.status(500).json({ message: "Server error fetching active users." });
  }
});

router.put("/logout/:id", async (req, res) => {
  try {
    const { id } = req.params

    const user = await User.deactivateUser(id)

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Server error during logout." });
  }
});

export default router;
