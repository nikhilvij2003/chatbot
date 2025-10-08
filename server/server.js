const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");
require("dotenv").config();
const axios = require("axios");

const authRoutes = require("./routes/auth");
const pptRoutes = require("./routes/ppt");
const projectRoutes = require("./routes/project");  // Added import for project routes
const { initializeSocket } = require("./config/Socket"); // ⬅️ your socket handler

const CLIENT_URL = process.env.IS_PROD === 'true' 
  ? "https://omni-beta-teal.vercel.app" 
  : "http://localhost:3000";

const app = express();
const http = require("http");
const server = http.createServer(app); // ✅ attach express app to HTTP server
const socketIO = require("socket.io");
const io = socketIO(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
  }
});

// ✅ Initialize Socket.IO with event handlers
initializeSocket(io);

// Middleware
app.use(express.json());
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  })
);

app.use(passport.initialize());
app.use(passport.session());

require("./config/passport");
require("./config/googleCalendar");

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/ppt", pptRoutes);
app.use("/api/project", projectRoutes);  // Added project routes registration

app.get('/api/news', async (req, res) => {
  try {
    const response = await axios.get(`https://newsapi.org/v2/top-headlines?sources=bbc-news&apiKey=${process.env.NEWS_API_KEY}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});


app.get("/api/weather/coords", async (req, res) => {
  const { lat, lon } = req.query;
  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${process.env.WEATHER_API_KEY}&units=metric`
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch weather data by coordinates." });
  }
});

// Fetch weather by city
app.get("/api/weather/city", async (req, res) => {
  const { city } = req.query;
  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.WEATHER_API_KEY}&units=metric`
    );
    res.json(response.data);
  } catch (error) {
    res.status(404).json({ message: "City not found." });
  }
});



// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ✅ Use HTTP server instead of app.listen
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
