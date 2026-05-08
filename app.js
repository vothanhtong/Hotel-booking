require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");


const app = express();

// MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require("./routes/auth");
const bookingRoutes = require("./routes/booking");
const adminRoutes = require("./routes/admin");

app.use(authRoutes);
app.use(bookingRoutes);
app.use(adminRoutes);

// Server Port
const PORT = process.env.PORT || 8080;

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });