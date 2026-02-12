require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const path = require("path");

const User = require("./models/User");
const GroupMessage = require("./models/GroupMessage");


const initSocket = require("./socket-io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/views", express.static(path.join(__dirname, "views")));

// DB connect
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((e) => console.error("MongoDB error:", e.message));

// Pages
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "views", "index.html")));
app.get("/signup", (req, res) => res.sendFile(path.join(__dirname, "views", "signup.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "views", "login.html")));
app.get("/rooms", (req, res) => res.sendFile(path.join(__dirname, "views", "rooms.html")));
app.get("/chat", (req, res) => res.sendFile(path.join(__dirname, "views", "chat.html")));

// helper for signup date
function formatDate() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  let hh = d.getHours();
  const min = String(d.getMinutes()).padStart(2, "0");
  const ampm = hh >= 12 ? "PM" : "AM";
  hh = hh % 12 || 12;
  const hh2 = String(hh).padStart(2, "0");
  return `${mm}-${dd}-${yyyy} ${hh2}:${min} ${ampm}`;
}

// API: Signup
app.post("/api/signup", async (req, res) => {
  try {
    const { username, firstname, lastname, password } = req.body;
    if (!username || !firstname || !lastname || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existing = await User.findOne({ username: username.trim() });
    if (existing) return res.status(409).json({ message: "Username already exists." });

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: username.trim(),
      firstname: firstname.trim(),
      lastname: lastname.trim(),
      password: hash,
      createon: formatDate()
    });

    return res.json({ message: "Signup successful", user: { username: user.username } });
  } catch (e) {
    return res.status(500).json({ message: "Server error", error: e.message });
  }
});

// API: Login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Missing credentials." });

    const user = await User.findOne({ username: username.trim() });
    if (!user) return res.status(401).json({ message: "Invalid username/password." });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid username/password." });

    return res.json({
      message: "Login successful",
      user: { username: user.username, firstname: user.firstname, lastname: user.lastname }
    });
  } catch (e) {
    return res.status(500).json({ message: "Server error", error: e.message });
  }
});

// API: room messages
app.get("/api/room-messages", async (req, res) => {
  const { room } = req.query;
  if (!room) return res.status(400).json({ message: "room is required" });

  const msgs = await GroupMessage.find({ room }).sort({ _id: -1 }).limit(50);
  res.json(msgs.reverse());
});

// ✅ call socket init function (THIS IS THE MAIN CHANGE)
initSocket(io);

// start server
server.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on http://localhost:${process.env.PORT || 3000}`);
});
